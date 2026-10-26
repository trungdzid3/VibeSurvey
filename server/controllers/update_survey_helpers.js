const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'server', 'controllers', 'surveyController.js');
let code = fs.readFileSync(targetFile, 'utf8');

// Định nghĩa các helper mới cho SurveyController
const helperMethods = `
  /**
   * Helper chuẩn hóa câu hỏi từ cơ sở dữ liệu
   */
  _parseQuestionFromDb(q, isOwnerOrAdmin = false) {
    let rows = null;
    let columns = null;
    if (q.rows_json) {
      try { rows = JSON.parse(q.rows_json); } catch (e) {}
    }
    if (q.columns_json) {
      try { columns = JSON.parse(q.columns_json); } catch (e) {}
    }
    let options = null;
    if (q.options_json) {
      try {
        const parsed = JSON.parse(q.options_json);
        if (Array.isArray(parsed)) {
          options = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (!rows && parsed.rows) rows = parsed.rows;
          if (!columns && parsed.columns) columns = parsed.columns;
          options = parsed.options || parsed.columns || null;
        }
      } catch (e) {}
    }

    const resObj = {
      id: q.id,
      order_index: q.order_index,
      type: q.type,
      content: q.content,
      options: options,
      rows: rows,
      columns: columns,
      is_required: q.is_required !== undefined ? (q.is_required === 0 ? 0 : 1) : 1,
      is_screener: q.is_screener === 1,
      qualifying_answer: q.qualifying_answer || null
    };

    if (isOwnerOrAdmin) {
      resObj.is_attention_check = q.is_attention_check === 1;
      resObj.expected_answer = q.expected_answer || null;
    }
    return resObj;
  }

  /**
   * Helper trích xuất hồ sơ nhân khẩu học của người dùng
   */
  _getUserDemographics(user) {
    if (!user) return null;
    const userRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    if (!userRecord) return null;

    let userDemo = {};
    if (userRecord.demographics_json) {
      try { userDemo = JSON.parse(userRecord.demographics_json); } catch (e) {}
    }
    if (!userDemo || typeof userDemo !== 'object') userDemo = {};

    if (!userDemo.gender && userRecord.gender) userDemo.gender = userRecord.gender;
    if (!userDemo.province && userRecord.province) userDemo.province = userRecord.province;
    if (!userDemo.university && userRecord.university) userDemo.university = userRecord.university;
    if (!userDemo.major && userRecord.major) userDemo.major = userRecord.major;
    if (!userDemo.birth_date && userRecord.birth_date) userDemo.birth_date = userRecord.birth_date;
    if (!userDemo.birth_year && userRecord.birth_date) {
      const parts = userRecord.birth_date.split('-');
      if (parts[0]) userDemo.birth_year = parseInt(parts[0], 10);
    }
    userDemo.profile_completed = userRecord.profile_completed || 0;
    userDemo.account_tier = userRecord.account_tier || 'PERSONAL';
    return userDemo;
  }

  /**
   * Helper kiểm tra xem người dùng có khớp 100% tiêu chí lọc của khảo sát không
   */
  _checkUserMatchesTarget(userDemo, targetDemo) {
    if (!targetDemo || Object.keys(targetDemo).length === 0) {
      return { matchesAll: true, reason: 'NO_TARGET_FILTER' };
    }
    if (!userDemo || userDemo.profile_completed !== 1) {
      return { matchesAll: false, reason: 'PROFILE_NOT_COMPLETED' };
    }

    // 1. Giới tính
    if (targetDemo.gender && targetDemo.gender !== 'ALL' && targetDemo.gender !== 'ANY') {
      const uGen = (userDemo.gender || '').trim().toLowerCase();
      const tGen = String(targetDemo.gender).trim().toLowerCase();
      if (!uGen || uGen !== tGen) {
        return { matchesAll: false, failedCriterion: 'gender' };
      }
    }

    // 2. Khu vực Tỉnh / Thành phố
    if (targetDemo.provinces && Array.isArray(targetDemo.provinces) && targetDemo.provinces.length > 0 && !targetDemo.provinces.includes('ALL')) {
      const uProv = (userDemo.province || userDemo.province_code || '').trim().toLowerCase();
      if (!uProv) return { matchesAll: false, failedCriterion: 'province' };
      const matchedProv = targetDemo.provinces.some(p => {
        const lp = String(p).trim().toLowerCase();
        return uProv === lp || uProv.includes(lp) || lp.includes(uProv);
      });
      if (!matchedProv) return { matchesAll: false, failedCriterion: 'province' };
    }

    // 3. Trường đại học
    if (targetDemo.universities && Array.isArray(targetDemo.universities) && targetDemo.universities.length > 0 && !targetDemo.universities.includes('ALL')) {
      const uUni = (userDemo.university || userDemo.university_code || '').trim().toLowerCase();
      if (!uUni) return { matchesAll: false, failedCriterion: 'university' };
      const matchedUni = targetDemo.universities.some(u => {
        const lu = String(u).trim().toLowerCase();
        return uUni === lu || uUni.includes(lu) || lu.includes(uUni);
      });
      if (!matchedUni) return { matchesAll: false, failedCriterion: 'university' };
    }

    // 4. Ngành học
    if (targetDemo.majors && Array.isArray(targetDemo.majors) && targetDemo.majors.length > 0 && !targetDemo.majors.includes('ALL')) {
      const uMajor = (userDemo.major || userDemo.major_category || '').trim().toLowerCase();
      if (!uMajor) return { matchesAll: false, failedCriterion: 'major' };
      const matchedMajor = targetDemo.majors.some(m => {
        const lm = String(m).trim().toLowerCase();
        return uMajor === lm || uMajor.includes(lm) || lm.includes(uMajor);
      });
      if (!matchedMajor) return { matchesAll: false, failedCriterion: 'major' };
    }

    // 5. Độ tuổi
    if (targetDemo.age_min || targetDemo.age_max) {
      const currentYear = new Date().getFullYear();
      const birthYear = userDemo.birth_year || (userDemo.birth_date ? parseInt(userDemo.birth_date.split('-')[0], 10) : null);
      if (!birthYear) return { matchesAll: false, failedCriterion: 'age' };
      const age = currentYear - birthYear;
      if (targetDemo.age_min && age < targetDemo.age_min) return { matchesAll: false, failedCriterion: 'age' };
      if (targetDemo.age_max && age > targetDemo.age_max) return { matchesAll: false, failedCriterion: 'age' };
    }

    return { matchesAll: true };
  }

  /**
   * Helper sinh câu hỏi sàng lọc thích ứng cho người chưa khớp Profile
   */
  _generateAdaptiveScreenerQuestions(targetDemo) {
    const screeners = [];
    if (!targetDemo || typeof targetDemo !== 'object') return screeners;
    let sIndex = 1;

    if (targetDemo.gender && targetDemo.gender !== 'ALL' && targetDemo.gender !== 'ANY') {
      screeners.push({
        id: 'screener_gender',
        order_index: sIndex++,
        type: 'SINGLE_CHOICE',
        content: 'Giới tính của bạn là gì?',
        options: ['Nam', 'Nữ', 'Khác'],
        rows: null,
        columns: null,
        is_required: 1,
        is_screener: true,
        qualifying_answer: targetDemo.gender
      });
    }

    if (targetDemo.provinces && Array.isArray(targetDemo.provinces) && targetDemo.provinces.length > 0 && !targetDemo.provinces.includes('ALL')) {
      const provOptions = [...targetDemo.provinces, 'Khu vực khác'];
      screeners.push({
        id: 'screener_province',
        order_index: sIndex++,
        type: 'SINGLE_CHOICE',
        content: 'Khu vực sinh sống hoặc học tập hiện tại của bạn là ở đâu?',
        options: Array.from(new Set(provOptions)),
        rows: null,
        columns: null,
        is_required: 1,
        is_screener: true,
        qualifying_answer: targetDemo.provinces
      });
    }

    if (targetDemo.universities && Array.isArray(targetDemo.universities) && targetDemo.universities.length > 0 && !targetDemo.universities.includes('ALL')) {
      const uniOptions = [...targetDemo.universities, 'Trường đại học / cao đẳng khác'];
      screeners.push({
        id: 'screener_university',
        order_index: sIndex++,
        type: 'SINGLE_CHOICE',
        content: 'Bạn hiện đang theo học hoặc đã tốt nghiệp tại trường nào dưới đây?',
        options: Array.from(new Set(uniOptions)),
        rows: null,
        columns: null,
        is_required: 1,
        is_screener: true,
        qualifying_answer: targetDemo.universities
      });
    }

    if (targetDemo.majors && Array.isArray(targetDemo.majors) && targetDemo.majors.length > 0 && !targetDemo.majors.includes('ALL')) {
      const majorOptions = [...targetDemo.majors, 'Khối ngành khác'];
      screeners.push({
        id: 'screener_major',
        order_index: sIndex++,
        type: 'SINGLE_CHOICE',
        content: 'Khối ngành học chính hoặc lĩnh vực chuyên môn của bạn là gì?',
        options: Array.from(new Set(majorOptions)),
        rows: null,
        columns: null,
        is_required: 1,
        is_screener: true,
        qualifying_answer: targetDemo.majors
      });
    }

    if (targetDemo.age_min || targetDemo.age_max) {
      const min = targetDemo.age_min || 0;
      const max = targetDemo.age_max || 120;
      const targetLabel = (min > 0 && max < 120)
        ? min + ' - ' + max + ' tuổi'
        : (min > 0 ? 'Từ ' + min + ' tuổi trở lên' : 'Dưới ' + max + ' tuổi');

      screeners.push({
        id: 'screener_age',
        order_index: sIndex++,
        type: 'SINGLE_CHOICE',
        content: 'Độ tuổi hiện tại của bạn thuộc nhóm nào dưới đây?',
        options: [targetLabel, 'Nhóm tuổi khác'],
        rows: null,
        columns: null,
        is_required: 1,
        is_screener: true,
        qualifying_answer: targetLabel
      });
    }

    return screeners;
  }

  /**
   * Helper áp dụng logic Adaptive Auto-Screener
   */
  _applyAdaptiveScreener(survey, dbQuestions, user, isOwnerOrAdmin = false) {
    const parsedQuestions = dbQuestions.map(q => this._parseQuestionFromDb(q, isOwnerOrAdmin));

    if (isOwnerOrAdmin) {
      return {
        questions: parsedQuestions,
        autoScreenerBypassed: false,
        autoFilledDemographics: null
      };
    }

    let targetDemo = null;
    if (survey.target_demographics_json) {
      try { targetDemo = JSON.parse(survey.target_demographics_json); } catch (e) {}
    }

    const userDemo = this._getUserDemographics(user);
    const matchResult = this._checkUserMatchesTarget(userDemo, targetDemo);

    if (matchResult.matchesAll) {
      // ẨN toàn bộ các câu hỏi sàng lọc screener ở đầu bài (Smart Bypass)
      const nonScreenerQuestions = parsedQuestions.filter(q => !q.is_screener);
      const autoFilledDemographics = userDemo ? {
        gender: userDemo.gender || null,
        province: userDemo.province || null,
        university: userDemo.university || null,
        major: userDemo.major || null,
        birth_date: userDemo.birth_date || null,
        age: userDemo.birth_year ? (new Date().getFullYear() - userDemo.birth_year) : null
      } : null;

      return {
        questions: nonScreenerQuestions,
        autoScreenerBypassed: true,
        autoFilledDemographics
      };
    }

    // Chưa khớp Profile: nếu trong dbQuestions chưa có câu hỏi screener mà khảo sát có targetDemo thì chèn tự động ở đầu bài
    const hasExistingScreeners = parsedQuestions.some(q => q.is_screener);
    if (!hasExistingScreeners && targetDemo && Object.keys(targetDemo).length > 0) {
      const generatedScreeners = this._generateAdaptiveScreenerQuestions(targetDemo);
      const combined = [...generatedScreeners, ...parsedQuestions];
      // Đánh số lại order_index tuần tự
      combined.forEach((q, idx) => { q.order_index = idx + 1; });
      return {
        questions: combined,
        autoScreenerBypassed: false,
        autoFilledDemographics: null
      };
    }

    return {
      questions: parsedQuestions,
      autoScreenerBypassed: false,
      autoFilledDemographics: null
    };
  }
`;

// Chèn helperMethods ngay đầu class SurveyController
if (!code.includes('_parseQuestionFromDb')) {
  code = code.replace('class SurveyController {', 'class SurveyController {\n' + helperMethods);
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Đã chèn helper methods vào SurveyController');
