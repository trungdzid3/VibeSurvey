/**
 * matchingService.js - Thuật toán Đẩy Khảo sát Mục tiêu & Xếp hạng Bảng tin
 * Theo chỉ đạo chiến lược Gemini 4 Argon (VibeSurvey v2.0)
 */

class MatchingService {
  constructor() {
    this.UNIVERSITIES = [
      { code: 'ALL', name: 'Tất cả trường' },
      { code: 'HUST', name: 'ĐH Bách Khoa Hà Nội', shortName: 'Bách Khoa' },
      { code: 'NEU', name: 'ĐH Kinh Tế Quốc Dân', shortName: 'Kinh Tế Quốc Dân' },
      { code: 'VNU', name: 'ĐHQG Hà Nội / ĐHQG TP.HCM', shortName: 'ĐH Quốc Gia' },
      { code: 'FTU', name: 'ĐH Ngoại Thương', shortName: 'Ngoại Thương' },
      { code: 'UMP', name: 'ĐH Y Dược', shortName: 'Y Dược' },
      { code: 'FPT', name: 'Đại học FPT', shortName: 'FPT' },
      { code: 'BA', name: 'Học viện Ngân Hàng', shortName: 'HV Ngân Hàng' },
      { code: 'UEH', name: 'ĐH Kinh Tế TP.HCM', shortName: 'UEH' },
      { code: 'HCMUT', name: 'ĐH Bách Khoa TP.HCM', shortName: 'BK TP.HCM' }
    ];

    this.PROVINCES = [
      { code: 'HN', name: 'Hà Nội' },
      { code: 'HCM', name: 'TP. Hồ Chí Minh' },
      { code: 'DN', name: 'Đà Nẵng' },
      { code: 'CT', name: 'Cần Thơ' },
      { code: 'HP', name: 'Hải Phòng' },
      { code: 'OTHER', name: 'Tỉnh thành khác' }
    ];

    this.MAJORS = [
      { code: 'ECONOMICS', name: 'Kinh tế & Quản trị kinh doanh' },
      { code: 'IT_TECH', name: 'Công nghệ thông tin & Khoa học máy tính' },
      { code: 'MEDICINE', name: 'Y Dược & Chăm sóc sức khỏe' },
      { code: 'ENGINEERING', name: 'Kỹ thuật & Cơ khí - Tự động hóa' },
      { code: 'LANGUAGES', name: 'Ngoại ngữ & Khoa học xã hội' },
      { code: 'FREELANCE', name: 'Ngành nghề khác / Đã đi làm' }
    ];

    this.WEIGHTS = {
      university: 0.35,
      major: 0.25,
      age: 0.20,
      province: 0.10,
      gender: 0.10
    };
  }

  /**
   * Tính toán điểm tương đồng (Match Score %) giữa người dùng và tiêu chí khảo sát
   * @param {Object} userDemo Hồ sơ nhân khẩu học người dùng
   * @param {Object} targetDemo Tiêu chí mục tiêu của khảo sát
   * @returns {Object} { matchScore: number, matchLabel: string, badgeColor: string }
   */
  calculateMatchScore(userDemo = {}, targetDemo = {}) {
    // Nếu khảo sát không đặt tiêu chí nào -> Phù hợp 100% với tất cả mọi người
    if (!targetDemo || Object.keys(targetDemo).length === 0) {
      return {
        matchScore: 100,
        matchLabel: 'Đại trà',
        badgeColor: 'text-slate-600 bg-slate-100'
      };
    }

    let totalWeight = 0;
    let earnedWeight = 0;

    // 1. Trường Đại học (w = 0.35)
    if (targetDemo.universities && targetDemo.universities.length > 0 && !targetDemo.universities.includes('ALL')) {
      const w = this.WEIGHTS.university;
      totalWeight += w;
      if (userDemo.university_code && targetDemo.universities.includes(userDemo.university_code)) {
        earnedWeight += w * 1.0;
      } else if (!userDemo.university_code) {
        earnedWeight += w * 0.3; // Chưa khai báo
      }
    }

    // 2. Ngành học / Nghề nghiệp (w = 0.25)
    if (targetDemo.majors && targetDemo.majors.length > 0 && !targetDemo.majors.includes('ALL')) {
      const w = this.WEIGHTS.major;
      totalWeight += w;
      if (userDemo.major_category && targetDemo.majors.includes(userDemo.major_category)) {
        earnedWeight += w * 1.0;
      } else if (!userDemo.major_category) {
        earnedWeight += w * 0.3;
      }
    }

    // 3. Tỉnh / Thành phố (w = 0.10)
    if (targetDemo.provinces && targetDemo.provinces.length > 0 && !targetDemo.provinces.includes('ALL')) {
      const w = this.WEIGHTS.province;
      totalWeight += w;
      if (userDemo.province_code && targetDemo.provinces.includes(userDemo.province_code)) {
        earnedWeight += w * 1.0;
      } else if (!userDemo.province_code) {
        earnedWeight += w * 0.3;
      }
    }

    // 4. Độ tuổi / Năm sinh (w = 0.20)
    if (targetDemo.age_min || targetDemo.age_max) {
      const w = this.WEIGHTS.age;
      totalWeight += w;
      const currentYear = new Date().getFullYear();
      const userAge = userDemo.birth_year ? (currentYear - userDemo.birth_year) : null;
      if (userAge !== null) {
        const min = targetDemo.age_min || 0;
        const max = targetDemo.age_max || 120;
        if (userAge >= min && userAge <= max) {
          earnedWeight += w * 1.0;
        }
      } else {
        earnedWeight += w * 0.3;
      }
    }

    // 5. Giới tính (w = 0.10)
    if (targetDemo.gender && targetDemo.gender !== 'ANY') {
      const w = this.WEIGHTS.gender;
      totalWeight += w;
      if (userDemo.gender && userDemo.gender === targetDemo.gender) {
        earnedWeight += w * 1.0;
      } else if (!userDemo.gender) {
        earnedWeight += w * 0.3;
      }
    }

    if (totalWeight === 0) {
      return {
        matchScore: 100,
        matchLabel: 'Đại trà',
        badgeColor: 'text-slate-600 bg-slate-100'
      };
    }

    const matchScore = Math.round((earnedWeight / totalWeight) * 100);

    let matchLabel = '';
    let badgeColor = '';
    if (matchScore >= 90) {
      matchLabel = '🔥 Phù hợp 100%';
      badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (matchScore >= 70) {
      matchLabel = `✨ Khớp ${matchScore}%`;
      badgeColor = 'text-blue-700 bg-blue-50 border-blue-200';
    } else if (matchScore >= 40) {
      matchLabel = `Phù hợp ${matchScore}%`;
      badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      matchLabel = 'Đại trà';
      badgeColor = 'text-slate-600 bg-slate-100 border-slate-200';
    }

    return {
      matchScore,
      matchLabel,
      badgeColor
    };
  }

  /**
   * Tính điểm xếp hạng ưu tiên hiển thị trên Feed (Feed Ranking Score)
   */
  calculateFeedRankingScore(matchScore, rewardPoints, collected, target) {
    const matchRatio = matchScore / 100;
    const rewardWeight = Math.log(1 + (rewardPoints || 100));
    const urgency = (target > 0 && (collected / target) >= 0.8) ? 1.4 : 1.0;
    return (matchRatio * matchRatio) * rewardWeight * urgency;
  }
}

module.exports = new MatchingService();
