/**
 * Controller Quan Ly Dien Dan Thao Luan & Chia Se Khao Sat Noi Bo (Forum Controller)
 * SurvHub Community Board
 */

const crypto = require('crypto');
const db = require('../db/database');

/**
 * Kiem tra va chan link ngoai (Anti-URL Spoofing)
 * Chặn: http://, https://, ftp://, www., forms.gle, forms.office, .com, .vn, .net, IPv4...
 * @param {string} text Doan van ban can kiem tra
 * @returns {boolean} true neu chua link ngoai
 */
function containsExternalLink(text) {
  if (!text || typeof text !== 'string') return false;

  // 1. Giao thuc mang
  if (/(?:https?|ftp|file):\/\//i.test(text)) return true;

  // 2. Tien to www
  if (/\bwww\.[a-z0-9-]+/i.test(text)) return true;

  // 3. Cac dich vu bieu mau ngoai pho bien
  if (/(?:forms\.gle|forms\.office|forms\.microsoft|docs\.google|drive\.google)/i.test(text)) return true;

  // 4. Cac duoi ten mien pho bien
  if (/\b[a-z0-9][a-z0-9-]*\.(?:com|vn|net|org|edu|gov|io|xyz|co|cc|me|info|biz|app|dev|link|site|top|online|tech|ai|asia|club|vip|pro|icu|fun|space|shop|store|live)(?:\b|\/)/i.test(text)) {
    return true;
  }

  // 5. Dia chi IPv4
  if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text)) return true;

  return false;
}

class ForumController {
  /**
   * Lay danh sach bai viet dien dan (kem phan trang va loc bao mat Edu)
   * GET /api/forum/posts
   */
  listPosts(req, res) {
    try {
      const user = req.user;
      const {
        page = 1,
        limit = 20,
        survey_id = null,
        scope = 'all',
        search = null
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];
      const params = [];

      // Loc rieng theo survey neu co yeu cau
      if (survey_id) {
        conditions.push('p.survey_id = ?');
        params.push(survey_id);
      }

      // Loc bai viet cua chinh toi neu scope = 'my_posts'
      if (scope === 'my_posts' && user) {
        conditions.push('p.user_id = ?');
        params.push(user.id);
      }

      // Tim kiem tu khoa trong tieu de va noi dung
      if (search && typeof search === 'string' && search.trim().length > 0) {
        conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      // RÀNG BUỘC CỐT LÕI: Cach ly khao sat Trao Doi Sinh Vien (Edu Karma Exchange)
      // "Chi cho edu, edu moi hien thi, con lai khong hien thi"
      if (!user) {
        // Khach vang lai: chi xem bai viet co khao sat khong phai exchange
        conditions.push('(s.is_student_exchange IS NULL OR s.is_student_exchange = 0)');
      } else if (user.role === 'ADMIN') {
        // Admin xem duoc tat ca
      } else if (user.is_student_verified === 1) {
        // Sinh vien da xac thuc xem duoc tat ca (ca bai thuong va bai exchange)
      } else {
        // Nguoi dung thuong chua xac thuc edu: chi xem bai thuong HOAC bai do chinh minh dang
        conditions.push('(s.is_student_exchange IS NULL OR s.is_student_exchange = 0 OR p.user_id = ?)');
        params.push(user.id);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Dem tong so bai viet thoa man dieu kien
      const countSql = `
        SELECT COUNT(*) as total
        FROM forum_posts p
        JOIN surveys s ON p.survey_id = s.id
        ${whereClause}
      `;
      const totalRow = db.prepare(countSql).get(...params);
      const total = totalRow ? totalRow.total : 0;

      // Lay danh sach bai viet kem thong tin tac gia, khao sat va luot tuong tac
      const currentUserId = user ? user.id : '';
      const listSql = `
        SELECT 
          p.id, p.title, p.content, p.views_count, p.likes_count, p.created_at, p.updated_at,
          u.id AS author_id, u.name AS author_name, u.role AS author_role, u.is_student_verified AS author_is_student_verified,
          s.id AS survey_id, s.title AS survey_title, s.description AS survey_description, s.category AS survey_category,
          s.target_responses, s.collected_responses, s.reward_points_per_response, s.cost_per_response,
          s.status AS survey_status, s.is_student_exchange, s.cover_image_url AS survey_cover_image_url,
          (SELECT COUNT(*) FROM forum_comments fc WHERE fc.post_id = p.id) AS comments_count,
          EXISTS(SELECT 1 FROM forum_post_likes fpl WHERE fpl.post_id = p.id AND fpl.user_id = ?) AS is_liked
        FROM forum_posts p
        JOIN users u ON p.user_id = u.id
        JOIN surveys s ON p.survey_id = s.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const posts = db.prepare(listSql).all(currentUserId, ...params, limitNum, offset);

      // Dinh dang du lieu tra ve client
      const formattedPosts = posts.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        views_count: row.views_count || 0,
        likes_count: row.likes_count || 0,
        comments_count: row.comments_count || 0,
        is_liked: Boolean(row.is_liked),
        created_at: row.created_at,
        updated_at: row.updated_at,
        author: {
          id: row.author_id,
          name: row.author_name,
          role: row.author_role,
          is_student_verified: row.author_is_student_verified === 1
        },
        survey: {
          id: row.survey_id,
          title: row.survey_title,
          description: row.survey_description,
          category: row.survey_category,
          target_responses: row.target_responses,
          collected_responses: row.collected_responses,
          reward_points_per_response: row.reward_points_per_response,
          status: row.survey_status,
          is_student_exchange: row.is_student_exchange === 1,
          cover_image_url: row.survey_cover_image_url
        }
      }));

      return res.json({
        success: true,
        posts: formattedPosts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (err) {
      console.error('Loi listPosts:', err);
      return res.status(500).json({ success: false, message: 'Loi tai danh sach bai viet: ' + err.message });
    }
  }

  /**
   * Lay chi tiet mot bai viet dien dan (kem binh luan & kiem tra quyen Edu)
   * GET /api/forum/posts/:id
   */
  getPost(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const postRow = db.prepare(`
        SELECT 
          p.id, p.title, p.content, p.views_count, p.likes_count, p.created_at, p.updated_at,
          u.id AS author_id, u.name AS author_name, u.role AS author_role, u.is_student_verified AS author_is_student_verified,
          s.id AS survey_id, s.title AS survey_title, s.description AS survey_description, s.category AS survey_category,
          s.target_responses, s.collected_responses, s.reward_points_per_response, s.cost_per_response,
          s.status AS survey_status, s.is_student_exchange, s.cover_image_url AS survey_cover_image_url
        FROM forum_posts p
        JOIN users u ON p.user_id = u.id
        JOIN surveys s ON p.survey_id = s.id
        WHERE p.id = ?
      `).get(id);

      if (!postRow) {
        return res.status(404).json({ success: false, message: 'Khong tim thay bai viet' });
      }

      // RÀNG BUỘC CỐT LÕI: Kiem tra quyen truy cap khao sat Trao Doi Sinh Vien
      if (postRow.is_student_exchange === 1) {
        const isOwner = user && user.id === postRow.author_id;
        const isAdmin = user && user.role === 'ADMIN';
        const isVerifiedStudent = user && user.is_student_verified === 1;

        if (!isOwner && !isAdmin && !isVerifiedStudent) {
          return res.status(403).json({
            success: false,
            message: 'Bài viết này thuộc khu vực Trao Đổi Sinh Viên. Chỉ dành riêng cho sinh viên đã xác thực email trường (.edu).'
          });
        }
      }

      // Tang so luot xem (views_count)
      db.prepare('UPDATE forum_posts SET views_count = views_count + 1 WHERE id = ?').run(id);

      // Kiem tra nguoi dung hien tai da like chua
      let isLiked = false;
      if (user) {
        const likeRow = db.prepare('SELECT 1 FROM forum_post_likes WHERE post_id = ? AND user_id = ?').get(id, user.id);
        isLiked = Boolean(likeRow);
      }

      // Lay danh sach binh luan
      const comments = db.prepare(`
        SELECT 
          c.id, c.content, c.created_at,
          u.id AS user_id, u.name AS user_name, u.role AS user_role, u.is_student_verified AS user_is_student_verified
        FROM forum_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `).all(id).map(c => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        author: {
          id: c.user_id,
          name: c.user_name,
          role: c.user_role,
          is_student_verified: c.user_is_student_verified === 1
        }
      }));

      return res.json({
        success: true,
        post: {
          id: postRow.id,
          title: postRow.title,
          content: postRow.content,
          views_count: (postRow.views_count || 0) + 1,
          likes_count: postRow.likes_count || 0,
          comments_count: comments.length,
          is_liked: isLiked,
          created_at: postRow.created_at,
          updated_at: postRow.updated_at,
          author: {
            id: postRow.author_id,
            name: postRow.author_name,
            role: postRow.author_role,
            is_student_verified: postRow.author_is_student_verified === 1
          },
          survey: {
            id: postRow.survey_id,
            title: postRow.survey_title,
            description: postRow.survey_description,
            category: postRow.survey_category,
            target_responses: postRow.target_responses,
            collected_responses: postRow.collected_responses,
            reward_points_per_response: postRow.reward_points_per_response,
            status: postRow.survey_status,
            is_student_exchange: postRow.is_student_exchange === 1,
            cover_image_url: postRow.survey_cover_image_url
          },
          comments
        }
      });
    } catch (err) {
      console.error('Loi getPost:', err);
      return res.status(500).json({ success: false, message: 'Loi tai chi tiet bai viet: ' + err.message });
    }
  }

  /**
   * Tao bai viet moi tren dien dan
   * POST /api/forum/posts
   */
  createPost(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Yeu cau dang nhap de dang bai' });
      }

      const { title, content, survey_id } = req.body;

      // 1. Kiem dinh tieu de va noi dung
      if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
        return res.status(400).json({ success: false, message: 'Tieu de bai viet phai tu 3 den 200 ky tu' });
      }

      if (!content || typeof content !== 'string' || content.trim().length < 5 || content.trim().length > 5000) {
        return res.status(400).json({ success: false, message: 'Noi dung bai viet phai tu 5 den 5,000 ky tu' });
      }

      // 2. RÀNG BUỘC CỐT LÕI: Chặn chèn link ngoài (Anti-URL Spoofing)
      if (containsExternalLink(title) || containsExternalLink(content)) {
        return res.status(400).json({
          success: false,
          code: 'EXTERNAL_LINKS_PROHIBITED',
          message: 'Diễn đàn không cho phép chia sẻ liên kết ngoài. Bạn chỉ có thể đính kèm bài khảo sát hợp lệ trên hệ thống SurvHub.'
        });
      }

      // 3. RÀNG BUỘC CỐT LÕI: Bat buoc dinh kem khao sat hop le cua chinh minh
      if (!survey_id || typeof survey_id !== 'string') {
        return res.status(400).json({ success: false, message: 'Bài viết trên diễn đàn bắt buộc phải đính kèm một bài khảo sát hợp lệ.' });
      }

      const survey = db.prepare('SELECT id, creator_id, status, is_student_exchange FROM surveys WHERE id = ?').get(survey_id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát đính kèm không tồn tại.' });
      }

      if (survey.creator_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Bạn chỉ có thể đính kèm bài khảo sát do chính bạn tạo và sở hữu.'
        });
      }

      if (survey.status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          message: 'Khảo sát đính kèm phải đang ở trạng thái hoạt động (ACTIVE). Khảo sát đang nháp hoặc đã đóng không thể chia sẻ lên diễn đàn.'
        });
      }

      // Neu khao sat la exchange ma user chua xac thuc sinh vien -> chan
      if (survey.is_student_exchange === 1 && user.is_student_verified !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ tài khoản sinh viên đã xác thực email trường (.edu) mới được chia sẻ khảo sát trao đổi sinh viên.'
        });
      }

      const postId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO forum_posts (id, user_id, survey_id, title, content)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, user.id, survey_id, title.trim(), content.trim());

      return res.status(201).json({
        success: true,
        message: 'Đăng bài thảo luận lên diễn đàn thành công!',
        postId
      });
    } catch (err) {
      console.error('Loi createPost:', err);
      return res.status(500).json({ success: false, message: 'Loi tao bai viet: ' + err.message });
    }
  }

  /**
   * Binh luan vao bai viet tren dien dan
   * POST /api/forum/posts/:id/comments
   */
  addComment(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Yeu cau dang nhap de binh luan' });
      }

      const { id } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 2000) {
        return res.status(400).json({ success: false, message: 'Noi dung binh luan phai tu 1 den 2,000 ky tu' });
      }

      // RÀNG BUỘC CỐT LÕI: Chặn link ngoài trong bình luận
      if (containsExternalLink(content)) {
        return res.status(400).json({
          success: false,
          code: 'EXTERNAL_LINKS_PROHIBITED',
          message: 'Diễn đàn không cho phép chia sẻ liên kết ngoài. Bạn chỉ có thể đính kèm bài khảo sát hợp lệ trên hệ thống SurvHub.'
        });
      }

      const post = db.prepare(`
        SELECT p.id, p.user_id, s.is_student_exchange 
        FROM forum_posts p
        JOIN surveys s ON p.survey_id = s.id
        WHERE p.id = ?
      `).get(id);

      if (!post) {
        return res.status(404).json({ success: false, message: 'Bai viet khong ton tai' });
      }

      // Kiem tra quyen truy cap Edu
      if (post.is_student_exchange === 1) {
        const isOwner = user.id === post.user_id;
        const isAdmin = user.role === 'ADMIN';
        const isVerifiedStudent = user.is_student_verified === 1;

        if (!isOwner && !isAdmin && !isVerifiedStudent) {
          return res.status(403).json({
            success: false,
            message: 'Bài viết này thuộc khu vực Trao Đổi Sinh Viên. Chỉ dành riêng cho sinh viên đã xác thực email trường (.edu).'
          });
        }
      }

      const commentId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO forum_comments (id, post_id, user_id, content)
        VALUES (?, ?, ?, ?)
      `).run(commentId, id, user.id, content.trim());

      const newComment = db.prepare(`
        SELECT c.id, c.content, c.created_at, u.id AS user_id, u.name AS user_name, u.role AS user_role, u.is_student_verified AS user_is_student_verified
        FROM forum_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `).get(commentId);

      return res.status(201).json({
        success: true,
        message: 'Gửi bình luận thành công',
        comment: {
          id: newComment.id,
          content: newComment.content,
          created_at: newComment.created_at,
          author: {
            id: newComment.user_id,
            name: newComment.user_name,
            role: newComment.user_role,
            is_student_verified: newComment.user_is_student_verified === 1
          }
        }
      });
    } catch (err) {
      console.error('Loi addComment:', err);
      return res.status(500).json({ success: false, message: 'Loi gui binh luan: ' + err.message });
    }
  }

  /**
   * Tha tim / Bo tha tim bai viet
   * POST /api/forum/posts/:id/like
   */
  toggleLike(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Yeu cau dang nhap de tha tim' });
      }

      const { id } = req.params;

      const post = db.prepare(`
        SELECT p.id, p.user_id, s.is_student_exchange 
        FROM forum_posts p
        JOIN surveys s ON p.survey_id = s.id
        WHERE p.id = ?
      `).get(id);

      if (!post) {
        return res.status(404).json({ success: false, message: 'Bai viet khong ton tai' });
      }

      // Kiem tra quyen Edu
      if (post.is_student_exchange === 1) {
        const isOwner = user.id === post.user_id;
        const isAdmin = user.role === 'ADMIN';
        const isVerifiedStudent = user.is_student_verified === 1;

        if (!isOwner && !isAdmin && !isVerifiedStudent) {
          return res.status(403).json({
            success: false,
            message: 'Bài viết này thuộc khu vực Trao Đổi Sinh Viên. Chỉ dành riêng cho sinh viên đã xác thực email trường (.edu).'
          });
        }
      }

      const existingLike = db.prepare('SELECT 1 FROM forum_post_likes WHERE post_id = ? AND user_id = ?').get(id, user.id);

      let isLiked = false;
      db.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        if (existingLike) {
          db.prepare('DELETE FROM forum_post_likes WHERE post_id = ? AND user_id = ?').run(id, user.id);
          db.prepare('UPDATE forum_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(id);
          isLiked = false;
        } else {
          db.prepare('INSERT INTO forum_post_likes (post_id, user_id) VALUES (?, ?)').run(id, user.id);
          db.prepare('UPDATE forum_posts SET likes_count = likes_count + 1 WHERE id = ?').run(id);
          isLiked = true;
        }
        db.exec('COMMIT');
      } catch (dbErr) {
        db.exec('ROLLBACK');
        throw dbErr;
      }

      const updatedPost = db.prepare('SELECT likes_count FROM forum_posts WHERE id = ?').get(id);

      return res.json({
        success: true,
        is_liked: isLiked,
        likes_count: updatedPost ? updatedPost.likes_count : 0
      });
    } catch (err) {
      console.error('Loi toggleLike:', err);
      return res.status(500).json({ success: false, message: 'Loi thao tac like: ' + err.message });
    }
  }

  /**
   * Xoa bai viet tren dien dan
   * DELETE /api/forum/posts/:id
   */
  deletePost(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Yeu cau dang nhap de thuc hien' });
      }

      const { id } = req.params;

      const post = db.prepare('SELECT id, user_id FROM forum_posts WHERE id = ?').get(id);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Bai viet khong ton tai' });
      }

      if (user.role !== 'ADMIN' && post.user_id !== user.id) {
        return res.status(403).json({ success: false, message: 'Ban khong co quyen xoa bai viet nay' });
      }

      db.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        db.prepare('DELETE FROM forum_comments WHERE post_id = ?').run(id);
        db.prepare('DELETE FROM forum_post_likes WHERE post_id = ?').run(id);
        db.prepare('DELETE FROM forum_posts WHERE id = ?').run(id);
        db.exec('COMMIT');
      } catch (dbErr) {
        db.exec('ROLLBACK');
        throw dbErr;
      }

      return res.json({
        success: true,
        message: 'Đã xóa bài viết thành công'
      });
    } catch (err) {
      console.error('Loi deletePost:', err);
      return res.status(500).json({ success: false, message: 'Loi xoa bai viet: ' + err.message });
    }
  }
}

module.exports = new ForumController();
