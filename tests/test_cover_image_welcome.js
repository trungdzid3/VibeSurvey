const db = require('../server/db/database');
const surveyController = require('../server/controllers/surveyController');
const crypto = require('crypto');

async function runTest() {
  console.log('--- BAT DAU TEST: COVER IMAGE & WELCOME FLOW ---');
  let testSurveyId = null;
  let testUserId = null;
  let respondentId = null;

  try {
    // 1. Tao creator & respondent gia lap
    testUserId = 'test_creator_' + Date.now();
    respondentId = 'test_resp_' + Date.now();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, status, point_balance, credit_balance, trust_score)
      VALUES (?, ?, 'hash', 'Test Creator Cover', 'CREATOR', 'ACTIVE', 1000, 500000, 100)
    `).run(testUserId, `${testUserId}@example.com`);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, status, point_balance, credit_balance, trust_score)
      VALUES (?, ?, 'hash', 'Test Respondent Cover', 'RESPONDENT', 'ACTIVE', 0, 0, 100)
    `).run(respondentId, `${respondentId}@example.com`);

    // 2. Test createSurvey voi cover_image_url
    const mockCoverUrl = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200';
    const reqCreate = {
      user: { id: testUserId, role: 'CREATOR', status: 'ACTIVE' },
      body: {
        title: 'Khao Sat Thu Nghiem Anh Bia Welcome Screen',
        description: 'Mo ta chi tiet bai khao sat co anh bia Google Forms style',
        category: 'Thị trường',
        target_responses: 50,
        cover_image_url: mockCoverUrl,
        questions: [
          {
            order_index: 0,
            type: 'SINGLE_CHOICE',
            content: 'Ban danh gia the nao ve giao dien moi?',
            options: ['Rat tot', 'Binh thuong', 'Can cai thien'],
            is_required: 1
          }
        ]
      }
    };

    let createdSurveyId = null;
    const resCreate = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.data = data;
        if (data.surveyId) createdSurveyId = data.surveyId;
        else if (data.survey && data.survey.id) createdSurveyId = data.survey.id;
        return this;
      }
    };

    await surveyController.createSurvey(reqCreate, resCreate);
    if (!createdSurveyId) {
      throw new Error('Tao survey that bai: ' + JSON.stringify(resCreate.data));
    }
    testSurveyId = createdSurveyId;
    console.log('1. Tao khao sat thanh cong, ID:', testSurveyId);

    // Kiem tra trong SQLite xem cover_image_url co duoc luu chua
    const inDb = db.prepare('SELECT id, title, cover_image_url FROM surveys WHERE id = ?').get(testSurveyId);
    if (!inDb || inDb.cover_image_url !== mockCoverUrl) {
      throw new Error(`cover_image_url khong khop trong DB. Ky vong: ${mockCoverUrl}, Nhan duoc: ${inDb ? inDb.cover_image_url : 'null'}`);
    }
    console.log('2. Xac nhan DB luu dung cover_image_url:', inDb.cover_image_url);

    // 3. Test getSurvey voi tu cach Respondent
    const reqGetResp = {
      params: { id: testSurveyId },
      user: { id: respondentId, role: 'RESPONDENT', status: 'ACTIVE' }
    };
    let gotSurveyData = null;
    const resGetResp = {
      status(code) { return this; },
      json(data) {
        gotSurveyData = data;
        return this;
      }
    };

    surveyController.getSurvey(reqGetResp, resGetResp);
    if (!gotSurveyData || !gotSurveyData.survey) {
      throw new Error('getSurvey cho Respondent that bai: ' + JSON.stringify(gotSurveyData));
    }
    if (gotSurveyData.survey.cover_image_url !== mockCoverUrl) {
      throw new Error(`getSurvey tra ve cover_image_url khong dung cho Respondent: ${gotSurveyData.survey.cover_image_url}`);
    }
    console.log('3. Respondent nhan duoc day du cover_image_url tu getSurvey:', gotSurveyData.survey.cover_image_url);

    // 4. Test listSurveys
    // Chuyen status sang ACTIVE de listSurveys lay duoc
    db.prepare("UPDATE surveys SET status = 'ACTIVE' WHERE id = ?").run(testSurveyId);

    const reqList = {
      query: {},
      user: { id: respondentId, role: 'RESPONDENT', status: 'ACTIVE' }
    };
    let listData = null;
    const resList = {
      status(code) { return this; },
      json(data) {
        listData = data;
        return this;
      }
    };

    surveyController.listSurveys(reqList, resList);
    const foundInList = (listData.surveys || []).find(s => s.id === testSurveyId);
    if (!foundInList) {
      throw new Error('Khong tim thay survey trong listSurveys');
    }
    if (foundInList.cover_image_url !== mockCoverUrl) {
      throw new Error(`listSurveys tra ve cover_image_url khong khop: ${foundInList.cover_image_url}`);
    }
    console.log('4. listSurveys tra ve day du cover_image_url cho the portal card:', foundInList.cover_image_url);

    console.log('--- TAT CA 4/4 TEST COVER IMAGE & WELCOME FLOW DA PASS 100% ---');
  } finally {
    // Don dep test data an toan
    try {
      db.prepare('PRAGMA foreign_keys = OFF').run();
      if (testSurveyId) {
        db.prepare('DELETE FROM questions WHERE survey_id = ?').run(testSurveyId);
        db.prepare('DELETE FROM surveys WHERE id = ?').run(testSurveyId);
      }
      if (testUserId) db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
      if (respondentId) db.prepare('DELETE FROM users WHERE id = ?').run(respondentId);
      db.prepare('PRAGMA foreign_keys = ON').run();
      console.log('--- DA DON DEP TEST DATA AN TOAN ---');
    } catch (cleanErr) {
      console.warn('Loi don dep (bo qua):', cleanErr.message);
    }
  }
}

runTest().catch(err => {
  console.error('TEST THAT BAI:', err);
  process.exit(1);
});
