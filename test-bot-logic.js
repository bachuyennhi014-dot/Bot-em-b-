/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert';
import { dbManager } from './src/bot/database/db.js';
import { EconomyService } from './src/bot/services/economyService.js';
import { OrderService } from './src/bot/services/orderService.js';
import { MuteService } from './src/bot/services/muteService.js';
import { ModService } from './src/bot/services/modService.js';
import { ConfigService } from './src/bot/services/configService.js';
import { parseDuration } from './src/bot/utils/timeParser.js';
import { config } from './src/bot/config.js';

async function runTests() {
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ TOÀN BỘ CHỨC NĂNG BOT DISCORD...');
  await dbManager.init();

  const testBuyerId = '999111222333444';
  const testStaffId = '888777666555444';
  const testGuildId = '777666555444333';
  const adminId = config.BOT_ADMIN_ID; // 1402913586853974156

  // 1. Test Admin & Mod
  console.log('\n[TEST 1] Kiểm tra Admin & Mod System...');
  assert.strictEqual(ModService.isAdmin(adminId), true, 'Admin ID phải đúng là 1402913586853974156');
  assert.strictEqual(ModService.isAdmin(testBuyerId), false, 'User thường không phải admin');

  await ModService.addMod(testStaffId, adminId);
  assert.strictEqual(await ModService.isMod(testStaffId), true, 'Staff phải là Mod sau khi addMod');
  assert.strictEqual(await ModService.isAdminOrMod(testStaffId), true, 'Staff có quyền AdminOrMod');
  console.log('✅ Test 1 Passed: Admin & Mod hoạt động chính xác.');

  // 2. Test Mute System & Violations
  console.log('\n[TEST 2] Kiểm tra Mute System & Auto-mute...');
  const parsed10p = parseDuration('10p');
  assert.strictEqual(parsed10p.ms, 600000, '10p phải là 600,000ms');

  const permDuration = parseDuration('vv');
  assert.strictEqual(permDuration.isPermanent, true, 'vv phải là vĩnh viễn');

  await MuteService.muteUser({
    userId: 'user_muted_temp',
    mutedBy: testStaffId,
    durationMs: 5000,
    isPermanent: false,
    reason: 'Test mute'
  });
  assert.strictEqual(await MuteService.isMuted('user_muted_temp'), true, 'User phải đang bị mute');

  // Test unmute
  await MuteService.unmuteUser('user_muted_temp', testStaffId);
  assert.strictEqual(await MuteService.isMuted('user_muted_temp'), false, 'User phải được unmute');

  // Test Auto-mute 10 mins on violation
  await MuteService.handleViolation({
    userId: 'user_violator',
    command: '*Pchecksv',
    reason: 'Non-admin tried admin command',
    punishmentDurationMinutes: 10
  });
  assert.strictEqual(await MuteService.isMuted('user_violator'), true, 'Violator phải bị auto-mute 10 phút');
  console.log('✅ Test 2 Passed: Mute & Auto-mute phạt 10 phút hoạt động chính xác.');

  // 3. Test Cart & Orders
  console.log('\n[TEST 3] Kiểm tra Giỏ Hàng & Tạo Đơn Hàng...');
  await OrderService.clearCart(testBuyerId, testGuildId);
  await OrderService.addToCart({
    userId: testBuyerId,
    guildId: testGuildId,
    item: { id: 'croissant', name: '🥐 Bánh sừng bò', price: 10000 },
    quantity: 2
  });
  await OrderService.addToCart({
    userId: testBuyerId,
    guildId: testGuildId,
    item: { id: 'milk_tea', name: '🧋 Trà sữa', price: 15000 },
    quantity: 1
  });

  const cart = await OrderService.getCart(testBuyerId, testGuildId);
  assert.strictEqual(cart.items.length, 2, 'Giỏ hàng phải có 2 loại sản phẩm');
  assert.strictEqual(cart.total, 35000, 'Tổng tiền giỏ hàng phải là 35.000 kc (2x10000 + 1x15000)');

  // Create Order from Cart
  const { orderId } = await OrderService.createOrder({
    guildId: testGuildId,
    userId: testBuyerId,
    items: cart.items,
    totalAmount: cart.total,
    orderType: 'FOOD_DRINK'
  });
  assert(orderId.startsWith('ORDER-'), 'Order ID phải có prefix ORDER-');

  // Staff accepts order
  await OrderService.acceptOrder(orderId, testStaffId);
  const acceptedOrder = await OrderService.getOrder(orderId);
  assert.strictEqual(acceptedOrder.status, 'ACCEPTED', 'Đơn hàng phải ở trạng thái ACCEPTED');
  console.log('✅ Test 3 Passed: Giỏ hàng và quy trình tạo/nhận đơn hoạt động chuẩn xác.');

  // 4. Test Atomic Payment & Bot Fund Isolation
  console.log('\n[TEST 4] Kiểm tra Thanh Toán Nguyên Tử, Trừ Ví, Cộng Quỹ Lợn Đất & Chống Double Payment...');
  // Fund buyer wallet with 50.000 kc
  await EconomyService.addWallet(testBuyerId, 50000, 'TEST_CREDIT');
  const initialBalance = await EconomyService.getWallet(testBuyerId);
  const initialFund = await EconomyService.getBotFund();

  // Execute Payment
  const payResult1 = await EconomyService.payOrder({
    orderId,
    buyerId: testBuyerId,
    guildId: testGuildId
  });
  assert.strictEqual(payResult1.success, true, 'Thanh toán lần 1 phải thành công');

  const afterBalance = await EconomyService.getWallet(testBuyerId);
  const afterFund = await EconomyService.getBotFund();

  // Verify personal wallet deducted
  assert.strictEqual(afterBalance, initialBalance - 35000, 'Ví người chơi phải bị TRỪ chính xác 35.000 kc');

  // Verify BOT FUND increased
  assert.strictEqual(afterFund.balance, initialFund.balance + 35000, 'Quỹ "Lợn đất của em bé" phải CỘNG đúng 35.000 kc');
  console.log(`💰 Ví người chơi: ${initialBalance} -> ${afterBalance} kc (Trừ 35.000 kc)`);
  console.log(`🐷 Quỹ Lợn đất của em bé: ${initialFund.balance} -> ${afterFund.balance} kc (Cộng 35.000 kc)`);

  // ANTI-DOUBLE-PAYMENT TEST
  console.log('\n[TEST 5] Kiểm tra Chống Double Payment (Thanh toán lần 2)...');
  const payResult2 = await EconomyService.payOrder({
    orderId,
    buyerId: testBuyerId,
    guildId: testGuildId
  });
  assert.strictEqual(payResult2.success, false, 'Thanh toán lần 2 phải BỊ TỪ CHỐI');
  assert.strictEqual(payResult2.reason, 'ALREADY_PAID', 'Lý do từ chối phải là ALREADY_PAID');
  console.log('✅ Test 5 Passed: Chống double payment tuyệt đối - không thể thanh toán 2 lần!');

  // 5. Test 3-Strike Order Channel Violation
  console.log('\n[TEST 6] Kiểm tra Vi phạm dùng lệnh *Poder sai kênh (3 lần = Auto-mute 10 phút)...');
  await ConfigService.setOrderSetup(testGuildId, 'channel_order_correct', 'role_customer');

  const strike1 = await ConfigService.checkOrderChannel(testGuildId, 'channel_wrong', 'user_spammer');
  assert.strictEqual(strike1.allowed, false);
  assert.strictEqual(strike1.muted, false);

  const strike2 = await ConfigService.checkOrderChannel(testGuildId, 'channel_wrong', 'user_spammer');
  assert.strictEqual(strike2.allowed, false);
  assert.strictEqual(strike2.muted, false);

  const strike3 = await ConfigService.checkOrderChannel(testGuildId, 'channel_wrong', 'user_spammer');
  assert.strictEqual(strike3.allowed, false);
  assert.strictEqual(strike3.muted, true, 'Lần 3 phải bị Auto-mute 10 phút');
  assert.strictEqual(await MuteService.isMuted('user_spammer'), true, 'User spammer phải đang bị MUTE');
  console.log('✅ Test 6 Passed: Sai kênh 3 lần tự động MUTE BOT 10 phút thành công!');

  // 7. Test *Phelp Menu Generation
  console.log('\n[TEST 7] Kiểm tra *Phelp Embed Generation (Phân rõ 2 mục)...');
  const { BotEmbeds } = await import('./src/bot/utils/embedBuilder.js');
  const helpEmbed = BotEmbeds.helpMenu();
  assert(helpEmbed.data.fields.length >= 2, 'Help embed phải có tối thiểu 2 mục');
  assert(helpEmbed.data.fields[0].name.includes('MỌI NGƯỜI'), 'Mục 1 phải dành cho Mọi người');
  assert(helpEmbed.data.fields[1].name.includes('ADMIN & MOD'), 'Mục 2 phải dành cho Admin & Mod');
  console.log('✅ Test 7 Passed: *Phelp embed chia 2 mục rõ ràng thành công!');

  // 8. Test Role Configuration Service & Notification Channel
  console.log('\n[TEST 8] Kiểm tra RoleConfigService & Notification Channel...');
  const { RoleConfigService } = await import('./src/bot/services/roleConfigService.js');
  await RoleConfigService.setRole(testGuildId, 'role_mod', 'role_mod_123');
  await RoleConfigService.setRole(testGuildId, 'role_mtt', 'role_mtt_123');
  await RoleConfigService.setRole(testGuildId, 'role_tranh_cu_mod', 'role_tranhcu_123');
  await RoleConfigService.setRole(testGuildId, 'role_nv', 'role_nv_123');
  await RoleConfigService.setRole(testGuildId, 'role_nvtt', 'role_nvtt_123');
  await RoleConfigService.setRole(testGuildId, 'role_tp', 'role_tp_123');
  await RoleConfigService.setRole(testGuildId, 'role_ct', 'role_ct_123');
  await RoleConfigService.setRole(testGuildId, 'role_tk', 'role_tk_123');
  await RoleConfigService.setNotificationChannel(testGuildId, 'channel_notify_999');

  const roleCfg = await RoleConfigService.getRoleConfig(testGuildId);
  assert.strictEqual(roleCfg.role_mod, 'role_mod_123');
  assert.strictEqual(roleCfg.role_mtt, 'role_mtt_123');
  assert.strictEqual(roleCfg.role_tranh_cu_mod, 'role_tranhcu_123');
  assert.strictEqual(roleCfg.role_nv, 'role_nv_123');
  assert.strictEqual(roleCfg.role_nvtt, 'role_nvtt_123');
  assert.strictEqual(roleCfg.role_tp, 'role_tp_123');
  assert.strictEqual(roleCfg.role_ct, 'role_ct_123');
  assert.strictEqual(roleCfg.role_tk, 'role_tk_123');

  const notifyCh = await RoleConfigService.getNotificationChannel(testGuildId);
  assert.strictEqual(notifyCh, 'channel_notify_999');
  console.log('✅ Test 8 Passed: Role config & Notification channel lưu và lấy chuẩn xác theo từng server!');

  // 9. Test Company Lifecycle (Default, Custom, Join, Work, Promotion)
  console.log('\n[TEST 9] Kiểm tra Company Lifecycle & Promotion...');
  const { CompanyService } = await import('./src/bot/services/companyService.js');
  const defaultCty = await CompanyService.getCompanyByName('Công ty lốp trưởng');
  assert(defaultCty !== null, 'Công ty lốp trưởng mặc định phải tồn tại');
  assert.strictEqual(defaultCty.entry_fee, 100000, 'Phí vào công ty lốp trưởng = 100.000 KC');
  assert.strictEqual(defaultCty.daily_salary, 2500, 'Lương ngày = 2.500 KC');

  // Add KC for test worker to join
  const testWorkerId = 'worker_alpha_1';
  await dbManager.run('DELETE FROM company_members WHERE user_id = ?;', [testWorkerId]);
  await dbManager.run('DELETE FROM salary_claims WHERE user_id = ?;', [testWorkerId]);
  await EconomyService.addWallet(testWorkerId, 500000, 'TEST_SEED');

  // Join company
  const joinRes = await CompanyService.joinCompany({
    userId: testWorkerId,
    companyName: 'Công ty lốp trưởng'
  });
  assert.strictEqual(joinRes.entryFee, 100000);

  // Work 1 time
  const work1 = await CompanyService.work({
    userId: testWorkerId,
    companyName: 'Công ty lốp trưởng'
  });
  assert(work1.salary >= 1000 && work1.salary <= 10000, 'Lương ca làm từ 1.000 đến 10.000 KC');
  assert.strictEqual(work1.workCost, 10000000, 'Chi phí vận hành mỗi ca làm = 10.000.000 KC');
  assert.strictEqual(work1.workCount, 1);

  // Advance work count to 19 then 20 to trigger NVTT -> NV promotion (+100.000 KC bonus)
  await dbManager.run(
    'UPDATE company_members SET work_count = 19 WHERE user_id = ? AND company_id = ?;',
    [testWorkerId, defaultCty.id]
  );
  const balanceBeforePromo = await EconomyService.getWallet(testWorkerId);
  const work20 = await CompanyService.work({
    userId: testWorkerId,
    companyName: 'Công ty lốp trưởng'
  });
  assert(work20.promotionInfo !== null, 'Phải được thăng chức lên NV khi đạt 20 ca làm');
  assert.strictEqual(work20.promotionInfo.to, 'NV');
  assert.strictEqual(work20.promotionInfo.bonus, 100000, 'Thưởng thăng chức = 100.000 KC');
  const balanceAfterPromo = await EconomyService.getWallet(testWorkerId);
  assert(balanceAfterPromo >= balanceBeforePromo + 100000, 'Ví phải được cộng 100.000 KC bonus');
  console.log('✅ Test 9 Passed: Hệ thống công ty, ca làm, chi phí 10.000.000 KC và thăng chức +100.000 KC hoạt động hoàn hảo!');

  // 10. Test Daily Salary Distribution
  console.log('\n[TEST 10] Kiểm tra Lương Ngày (00:00, 1 lần/ngày, chống trùng lặp)...');
  const { DailySalaryService } = await import('./src/bot/services/dailySalaryService.js');
  const paidCount1 = await DailySalaryService.checkAndPayDailySalaries(null);
  assert(paidCount1 >= 1, 'Phải phát lương ít nhất cho 1 nhân viên vừa tham gia');

  // Second run on same day must pay 0
  const paidCount2 = await DailySalaryService.checkAndPayDailySalaries(null);
  assert.strictEqual(paidCount2, 0, 'Lần chạy thứ 2 trong cùng ngày không được phát thêm');
  console.log('✅ Test 10 Passed: Lương ngày +2.500 KC tự động phát chính xác 1 lần/ngày!');

  // 11. Test Disband Company with 100.000.000 KC compensation
  console.log('\n[TEST 11] Kiểm tra Giải Thể Công Ty & Đuổi Việc...');
  await dbManager.run('DELETE FROM companies WHERE name = ?;', ['Công ty Thử Nghiệm']);
  await dbManager.run('DELETE FROM company_members WHERE user_id IN (?, ?);', ['worker_beta_2', 'worker_gamma_3']);
  await CompanyService.createCompany({
    name: 'Công ty Thử Nghiệm',
    entryFee: 50000,
    workMin: 2000,
    workMax: 5000,
    dailySalary: 1000,
    createdBy: adminId
  });
  const disbandWorker = 'worker_beta_2';
  await EconomyService.addWallet(disbandWorker, 100000, 'TEST_SEED');
  await CompanyService.joinCompany({ userId: disbandWorker, companyName: 'Công ty Thử Nghiệm' });

  const disbandRes = await CompanyService.disbandCompany({
    name: 'Công ty Thử Nghiệm',
    adminId
  });
  assert.strictEqual(disbandRes.membersCount, 1);
  assert.strictEqual(disbandRes.payoutPerMember, 100000000, '1 nhân viên nhận đủ 100.000.000 KC tiền bồi thường giải thể');

  // Test Fire Employee
  const fireWorker = 'worker_gamma_3';
  await EconomyService.addWallet(fireWorker, 200000, 'TEST_SEED');
  await CompanyService.joinCompany({ userId: fireWorker, companyName: 'Công ty lốp trưởng' });
  const fireRes = await CompanyService.fireEmployee({
    userId: fireWorker,
    companyName: 'Công ty lốp trưởng',
    adminId
  });
  assert.strictEqual(fireRes.success, true);
  console.log('✅ Test 11 Passed: Giải thể công ty & sa thải nhân viên hoạt động chuẩn xác!');

  // 12. Test Election Service (Tranh cử Mod)
  console.log('\n[TEST 12] Kiểm tra Hệ Thống Tranh Cử Mod...');
  const { ElectionService } = await import('./src/bot/services/electionService.js');
  const electionId = await ElectionService.createElection({
    guildId: testGuildId,
    title: 'Bầu cử Mod khóa 1',
    channelId: 'channel_notify_999'
  });
  assert(electionId.startsWith('ELEC-'), 'Election ID format phải là ELEC-XXXX');

  // Mock member with role_tranh_cu_mod
  const mockMemberQualified = {
    guild: { id: testGuildId },
    roles: { cache: new Set(['role_tranhcu_123']) }
  };
  await ElectionService.registerCandidate({
    electionId,
    userId: 'candidate_user_1',
    userTag: 'HạtDẻCandidate#0001',
    member: mockMemberQualified
  });

  // Vote
  const voteRes = await ElectionService.vote({
    electionId,
    voterId: 'voter_random_1',
    candidateId: 1
  });
  assert.strictEqual(voteRes.newVotes, 1);

  // Close election
  const closeRes = await ElectionService.closeElection({
    electionId,
    guild: null,
    adminId
  });
  assert.strictEqual(closeRes.winner.user_id, 'candidate_user_1');
  console.log('✅ Test 12 Passed: Tranh cử Mod, ghi danh, bỏ phiếu, xác định người chiến thắng chuẩn xác!');

  console.log('\n==================================================');
  console.log('🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ ĐÃ THÀNH CÔNG RỰC RỠ!');
  console.log('==================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
