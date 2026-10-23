/**
 * Dịch Vụ Đồng Bộ Webhook Thời Gian Thực (Google Sheets & External Integrations)
 * Chịu trách nhiệm chuyển tiếp câu trả lời của đáp viên sang Google Sheets Webhook (Google Apps Script)
 * theo cơ chế Bất đồng bộ Không chặn luồng (Non-blocking Fire-and-Forget).
 */

class WebhookService {
  /**
   * Kiểm tra URL Webhook có hợp lệ không
   * @param {string} url 
   * @returns {boolean}
   */
  isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return false;
    }
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Chuẩn hóa Payload gửi sang Google Sheets theo đúng Đặc tả Mục 12
   * @param {object} responseData 
   * @returns {object}
   */
  formatPayload(responseData) {
    return {
      survey_id: responseData.survey_id || '',
      response_id: responseData.response_id || '',
      submitted_at: responseData.submitted_at || new Date().toISOString(),
      duration_sec: Math.max(0, parseInt(responseData.duration_sec, 10) || 0),
      quality_score: typeof responseData.quality_score === 'number' 
        ? Math.round(responseData.quality_score * 100) / 100 
        : 0,
      answers: (responseData.answers && typeof responseData.answers === 'object' && !Array.isArray(responseData.answers))
        ? responseData.answers
        : {}
    };
  }

  /**
   * Thực hiện gửi HTTP POST sang URL Webhook (Internal Async Worker)
   * @param {string} webhookUrl 
   * @param {object} payload 
   * @returns {Promise<{success: boolean, status?: number, message?: string}>}
   */
  async sendPayload(webhookUrl, payload) {
    try {
      if (!this.isValidUrl(webhookUrl)) {
        console.warn(`[WebhookSync] Bỏ qua gửi webhook: URL không hợp lệ (${webhookUrl})`);
        return { success: false, message: 'URL webhook không hợp lệ' };
      }

      const postBody = JSON.stringify(payload);
      
      // Node.js 18+ native fetch với timeout 10s và theo dõi redirect (Google Apps Script trả về 302 redirect)
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VibeSurvey-Webhook-Engine/1.0'
        },
        body: postBody,
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        console.warn(`[WebhookSync] Webhook nhận HTTP ${response.status} từ ${webhookUrl}`);
        return { success: false, status: response.status, message: `HTTP ${response.status}` };
      }

      return { success: true, status: response.status };
    } catch (err) {
      console.warn(`[WebhookSync] Lỗi bắn dữ liệu sang Webhook: ${err.message}`);
      return { success: false, message: err.message };
    }
  }

  /**
   * Kích hoạt đồng bộ sang Google Sheets bất đồng bộ Non-blocking (Fire-and-Forget)
   * Đảm bảo KHÔNG làm trễ thời gian phản hồi API nộp bài của đáp viên.
   * 
   * @param {string} webhookUrl - URL Google Apps Script Web App
   * @param {object} responseData - Dữ liệu bài làm đã được kiểm duyệt VALIDATED
   * @returns {Promise<{success: boolean, status?: number, message?: string}>}
   */
  dispatchGoogleSheetsSync(webhookUrl, responseData) {
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
      return Promise.resolve({ success: false, message: 'Không có Webhook URL' });
    }

    const payload = this.formatPayload(responseData);

    // Kích hoạt qua setImmediate để tách biệt hoàn toàn khỏi luồng xử lý HTTP request hiện tại
    const promise = new Promise((resolve) => {
      setImmediate(async () => {
        try {
          const result = await this.sendPayload(webhookUrl, payload);
          resolve(result);
        } catch (err) {
          console.warn('[WebhookSync] Lỗi ngoại lệ trong dispatch:', err.message);
          resolve({ success: false, message: err.message });
        }
      });
    });

    return promise;
  }
}

module.exports = new WebhookService();
