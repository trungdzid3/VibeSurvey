const crypto = require('crypto');
const db = require('../server/db/database');

function seedAcademicSurveys() {
  console.log('Seeding academic surveys...');

  // Lấy 1 Creator user có sẵn hoặc tạo nếu chưa có
  let creator = db.prepare("SELECT id FROM users WHERE role = 'CREATOR' LIMIT 1").get();
  if (!creator) {
    creator = { id: crypto.randomUUID() };
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, status)
      VALUES (?, 'creator_academic@gmail.com', 'dummy_hash', 'Hội Sinh Viên Nghiên Cứu', 'CREATOR', 10000000, 0, 'ACTIVE')
    `).run(creator.id);
  }

  // 1. Khảo sát HUST: Google Form + Voucher Highlands Coffee 50K
  const s1Id = 'survey_academic_hust_2026';
  const existing1 = db.prepare('SELECT id FROM surveys WHERE id = ?').get(s1Id);
  if (!existing1) {
    db.prepare(`
      INSERT INTO surveys (
        id, creator_id, title, description, category, target_responses, collected_responses,
        cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec,
        status, survey_source, external_form_url, academic_tags_json, target_demographics_json,
        sponsor_campaign_id, reward_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      s1Id,
      creator.id,
      'Khảo sát Nghiên cứu Thực trạng Áp lực Học tập & Đồ án Tốt nghiệp Sinh viên Kỹ thuật',
      'Đề tài nghiên cứu khoa học cấp Viện về mức độ căng thẳng, thời lượng tự học và tác động của đồ án tốt nghiệp đến sức khỏe tinh thần sinh viên.',
      'Nghiên cứu khoa học',
      120,
      48,
      4000.0,
      250,
      300000.0,
      15,
      'ACTIVE',
      'GOOGLE_FORMS',
      'https://docs.google.com/forms/d/e/1FAIpQLSd5bZ8QW_Sample_HUST/viewform',
      JSON.stringify(['#KhóaLuận', '#KỹThuật', '#HUST', '#BáchKhoa', '#TâmLýHọc']),
      JSON.stringify({ universities: ['HUST', 'HCMUT'], majors: ['IT_TECH', 'ENGINEERING'] }),
      'cat_highlands_50k',
      'HYBRID'
    );

    // Thêm các câu hỏi mẫu cho trình Stepper
    const qList1 = [
      {
        id: 'q_hust_1',
        survey_id: s1Id,
        order_index: 1,
        type: 'SINGLE_CHOICE',
        content: 'Bạn hiện đang là sinh viên năm thứ mấy tại trường Đại học?',
        options: ['Năm thứ nhất (K68/K69)', 'Năm thứ hai', 'Năm thứ ba', 'Năm thứ tư', 'Năm cuối / Đang làm đồ án']
      },
      {
        id: 'q_hust_2',
        survey_id: s1Id,
        order_index: 2,
        type: 'LIKERT_SCALE',
        content: 'Đánh giá mức độ áp lực khối lượng bài tập lớn & đồ án môn học hàng tuần của bạn:',
        options: ['1 - Rất nhẹ nhàng', '2 - Bình thường', '3 - Khá căng thẳng', '4 - Căng thẳng nhiều', '5 - Cực kỳ quá tải']
      },
      {
        id: 'q_hust_3',
        survey_id: s1Id,
        order_index: 3,
        type: 'MULTIPLE_CHOICE',
        content: 'Phương pháp bạn thường sử dụng nhất để giải tỏa stress trong kỳ thi? (Chọn nhiều)',
        options: ['Uống cà phê / Trà sữa cùng bạn bè', 'Chơi game / Xem phim giải trí', 'Chạy bộ / Thể thao', 'Ngủ bù']
      },
      {
        id: 'q_hust_4',
        survey_id: s1Id,
        order_index: 4,
        type: 'OPEN_TEXT',
        content: 'Bạn có đề xuất gì để nhà trường hỗ trợ sinh viên giảm tải áp lực đồ án tốt nghiệp?',
        options: null
      }
    ];

    for (const q of qList1) {
      db.prepare(`
        INSERT INTO questions (id, survey_id, order_index, type, content, options_json, is_attention_check, expected_answer)
        VALUES (?, ?, ?, ?, ?, ?, 0, null)
      `).run(q.id, q.survey_id, q.order_index, q.type, q.content, q.options ? JSON.stringify(q.options) : null);
    }
  }

  // 2. Khảo sát NEU & FTU: Microsoft Forms + Voucher Shopee 50K (Zero Cash Model)
  const s2Id = 'survey_academic_neu_2026';
  const existing2 = db.prepare('SELECT id FROM surveys WHERE id = ?').get(s2Id);
  if (!existing2) {
    db.prepare(`
      INSERT INTO surveys (
        id, creator_id, title, description, category, target_responses, collected_responses,
        cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec,
        status, survey_source, external_form_url, academic_tags_json, target_demographics_json,
        sponsor_campaign_id, reward_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      s2Id,
      creator.id,
      'Nghiên cứu Hành vi Tiêu dùng & Đặt Đồ Ăn Trực tuyến của Sinh viên Khối ngành Kinh tế',
      'Đề tài chuyên đề Khóa luận tốt nghiệp chuyên ngành Marketing & Quản trị Kinh doanh Đại học Kinh tế Quốc dân (NEU).',
      'Marketing & Tiêu dùng',
      100,
      22,
      0.0,
      0,
      0.0,
      12,
      'ACTIVE',
      'MS_FORMS',
      'https://forms.office.com/r/SampleNEU2026',
      JSON.stringify(['#KhóaLuận', '#Marketing', '#NEU', '#FTU', '#TàiTrợVoucher']),
      JSON.stringify({ universities: ['NEU', 'FTU', 'UEH', 'BA'], majors: ['ECONOMICS'] }),
      'cat_shopee_50k',
      'VOUCHER_ONLY'
    );

    const qList2 = [
      {
        id: 'q_neu_1',
        survey_id: s2Id,
        order_index: 1,
        type: 'SINGLE_CHOICE',
        content: 'Tần suất bạn sử dụng các ứng dụng giao thức ăn (ShopeeFood, GrabFood, Baemin) mỗi tuần?',
        options: ['Hầu như mỗi ngày (5-7 lần)', '3-4 lần / tuần', '1-2 lần / tuần', 'Hiếm khi sử dụng']
      },
      {
        id: 'q_neu_2',
        survey_id: s2Id,
        order_index: 2,
        type: 'MULTIPLE_CHOICE',
        content: 'Yếu tố nào tác động mạnh nhất đến quyết định chốt đơn đặt hàng của bạn?',
        options: ['Mã giảm giá / Freeship', 'Thời gian giao nhanh chóng', 'Đánh giá quán ăn trên app', 'Hình ảnh món ăn bắt mắt']
      },
      {
        id: 'q_neu_3',
        survey_id: s2Id,
        order_index: 3,
        type: 'LIKERT_SCALE',
        content: 'Mức độ hài lòng chung của bạn đối với các chương trình khuyến mãi cho sinh viên:',
        options: ['1 - Rất thất vọng', '2 - Tạm được', '3 - Bình thường', '4 - Hài lòng', '5 - Cực kỳ hài lòng']
      }
    ];

    for (const q of qList2) {
      db.prepare(`
        INSERT INTO questions (id, survey_id, order_index, type, content, options_json, is_attention_check, expected_answer)
        VALUES (?, ?, ?, ?, ?, ?, 0, null)
      `).run(q.id, q.survey_id, q.order_index, q.type, q.content, q.options ? JSON.stringify(q.options) : null);
    }
  }

  // 3. Khảo sát FPT & VNU: Smart Paste + 650 Điểm Thưởng Khủng
  const s3Id = 'survey_academic_fpt_ai_2026';
  const existing3 = db.prepare('SELECT id FROM surveys WHERE id = ?').get(s3Id);
  if (!existing3) {
    db.prepare(`
      INSERT INTO surveys (
        id, creator_id, title, description, category, target_responses, collected_responses,
        cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec,
        status, survey_source, external_form_url, academic_tags_json, target_demographics_json,
        sponsor_campaign_id, reward_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      s3Id,
      creator.id,
      'Khảo sát Mức độ Ứng dụng Trí tuệ Nhân tạo (ChatGPT, Claude, GitHub Copilot) trong Lập trình',
      'Nghiên cứu xu hướng sinh viên công nghệ sử dụng AI Agent để giải bài tập lập trình, debug và phát triển phần mềm.',
      'Công nghệ & AI',
      150,
      64,
      10000.0,
      650,
      860000.0,
      15,
      'ACTIVE',
      'SMART_PASTE',
      null,
      JSON.stringify(['#GenAI', '#IT', '#FPT', '#VNU', '#Copilot', '#LậpTrình']),
      JSON.stringify({ universities: ['FPT', 'VNU', 'HUST'], majors: ['IT_TECH'] }),
      null,
      'POINTS_ONLY'
    );

    const qList3 = [
      {
        id: 'q_fpt_1',
        survey_id: s3Id,
        order_index: 1,
        type: 'SINGLE_CHOICE',
        content: 'Công cụ AI hỗ trợ code nào bạn đang sử dụng thường xuyên nhất?',
        options: ['ChatGPT (OpenAI)', 'GitHub Copilot / Cursor', 'Claude (Anthropic)', 'Gemini (Google)', 'Chưa từng dùng AI']
      },
      {
        id: 'q_fpt_2',
        survey_id: s3Id,
        order_index: 2,
        type: 'LIKERT_SCALE',
        content: 'Theo bạn, việc sử dụng AI có giúp tăng năng suất hoàn thành bài tập lập trình không?',
        options: ['1 - Không giúp ích', '2 - Ít giúp ích', '3 - Bình thường', '4 - Giúp ích nhiều', '5 - Tăng tốc vượt trội']
      },
      {
        id: 'q_fpt_3',
        survey_id: s3Id,
        order_index: 3,
        type: 'SINGLE_CHOICE',
        content: 'Câu hỏi kiểm tra chú ý: Vui lòng chọn đáp án "Đồng ý kiểm tra chất lượng" dưới đây:',
        options: ['Bỏ qua', 'Đồng ý kiểm tra chất lượng', 'Không đồng ý', 'Xem đáp án']
      }
    ];

    for (const q of qList3) {
      db.prepare(`
        INSERT INTO questions (id, survey_id, order_index, type, content, options_json, is_attention_check, expected_answer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        q.id,
        q.survey_id,
        q.order_index,
        q.type,
        q.content,
        q.options ? JSON.stringify(q.options) : null,
        q.content.includes('kiểm tra chú ý') ? 1 : 0,
        q.content.includes('kiểm tra chú ý') ? 'Đồng ý kiểm tra chất lượng' : null
      );
    }
  }

  // 4. Khảo sát ĐH Y Dược UMP: Thể chất & Dinh dưỡng + Voucher Phúc Long 30K
  const s4Id = 'survey_academic_ump_health_2026';
  const existing4 = db.prepare('SELECT id FROM surveys WHERE id = ?').get(s4Id);
  if (!existing4) {
    db.prepare(`
      INSERT INTO surveys (
        id, creator_id, title, description, category, target_responses, collected_responses,
        cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec,
        status, survey_source, external_form_url, academic_tags_json, target_demographics_json,
        sponsor_campaign_id, reward_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      s4Id,
      creator.id,
      'Khảo sát Thói quen Rèn luyện Thể chất & Sử dụng Thực phẩm Bổ sung của Sinh viên Y Khoa',
      'Nghiên cứu về tình trạng thiếu ngủ, dinh dưỡng lâm sàng và thói quen thể dục của sinh viên y dược trong giai đoạn đi trực bệnh viện.',
      'Y Dược & Sức khỏe',
      80,
      14,
      3500.0,
      180,
      230000.0,
      10,
      'ACTIVE',
      'INTERNAL_BUILDER',
      null,
      JSON.stringify(['#YDuoc', '#SứcKhỏe', '#UMP', '#LâmSàng', '#DinhDưỡng']),
      JSON.stringify({ universities: ['UMP'], majors: ['MEDICINE'] }),
      'cat_phuclong_30k',
      'HYBRID'
    );

    const qList4 = [
      {
        id: 'q_ump_1',
        survey_id: s4Id,
        order_index: 1,
        type: 'SINGLE_CHOICE',
        content: 'Số giờ ngủ trung bình mỗi đêm của bạn trong tuần trực bệnh viện là bao nhiêu?',
        options: ['Dưới 4 tiếng', 'Từ 4 - 6 tiếng', 'Từ 6 - 8 tiếng', 'Trên 8 tiếng']
      },
      {
        id: 'q_ump_2',
        survey_id: s4Id,
        order_index: 2,
        type: 'LIKERT_SCALE',
        content: 'Tần suất rèn luyện thể dục thể thao hàng tuần của bạn:',
        options: ['1 - Không bao giờ', '2 - Hiếm khi', '3 - 1-2 lần/tuần', '4 - 3-4 lần/tuần', '5 - Hàng ngày']
      }
    ];

    for (const q of qList4) {
      db.prepare(`
        INSERT INTO questions (id, survey_id, order_index, type, content, options_json, is_attention_check, expected_answer)
        VALUES (?, ?, ?, ?, ?, ?, 0, null)
      `).run(q.id, q.survey_id, q.order_index, q.type, q.content, q.options ? JSON.stringify(q.options) : null);
    }
  }

  // Cập nhật người dùng demo Nguyễn Thùy Linh với hồ sơ sinh viên NEU chuẩn
  db.prepare(`
    UPDATE users 
    SET demographics_json = ? 
    WHERE email = 'respondent1@gmail.com'
  `).run(JSON.stringify({
    university_code: 'NEU',
    university_name: 'ĐH Kinh Tế Quốc Dân',
    major_category: 'ECONOMICS',
    province_code: 'HN',
    birth_year: 2003,
    gender: 'FEMALE'
  }));

  console.log('✅ Seed dữ liệu khảo sát nghiên cứu thành công!');
}

seedAcademicSurveys();
