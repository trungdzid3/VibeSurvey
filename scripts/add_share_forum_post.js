const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

// 1. Thêm nút Chia sẻ vào footer của post card
const targetCommentBtn = `<button onclick="VibeApp.toggleForumComments('\${post.id}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-all active:scale-95 cursor-pointer">
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
              <span id="forum-post-comment-count-\${post.id}" class="font-mono">\${post.comments_count || 0}</span>
              <span class="hidden sm:inline">bình luận</span>
            </button>`;

const newCommentAndShareBtn = `<button onclick="VibeApp.toggleForumComments('\${post.id}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-all active:scale-95 cursor-pointer">
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
              <span id="forum-post-comment-count-\${post.id}" class="font-mono">\${post.comments_count || 0}</span>
              <span class="hidden sm:inline">bình luận</span>
            </button>

            <!-- Nút Chia sẻ liên kết bài viết -->
            <button onclick="VibeApp.shareForumPost('\${post.id}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-all active:scale-95 cursor-pointer" title="Sao chép liên kết chia sẻ">
              <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">Chia sẻ</span>
            </button>`;

// Normalize CRLF to LF for comparison
const isCRLF = code.includes('\r\n');
const normalizedCode = code.replace(/\r\n/g, '\n');

if (normalizedCode.includes(targetCommentBtn)) {
  let updated = normalizedCode.replace(targetCommentBtn, newCommentAndShareBtn);
  
  // 2. Thêm hàm shareForumPost
  const targetFunc = '  async deleteForumPost(postId) {';
  const newFunc = `  shareForumPost(postId) {
    this.haptic('light');
    const shareUrl = \`\${window.location.origin}?tab=forum#post-\${postId}\`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showToast('Đã sao chép liên kết bài viết vào bộ nhớ tạm!', 'success');
      }).catch(() => {
        this.showToast(\`Liên kết bài viết: \${shareUrl}\`, 'info');
      });
    } else {
      this.showToast(\`Liên kết bài viết: \${shareUrl}\`, 'info');
    }
  },

  async deleteForumPost(postId) {`;

  updated = updated.replace(targetFunc, newFunc);
  
  if (isCRLF) {
    updated = updated.replace(/\n/g, '\r\n');
  }
  
  fs.writeFileSync('public/app.js', updated, 'utf8');
  console.log('Đã cập nhật thành công nút Chia sẻ và hàm shareForumPost!');
} else {
  console.log('Không tìm thấy targetCommentBtn!');
}
