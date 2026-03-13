// ============================================
// Simple Interaction System - 点赞和评论功能
// ============================================

class SimpleInteraction {
    constructor() {
        this.likes = JSON.parse(localStorage.getItem('lybx_likes')) || {};
        this.comments = JSON.parse(localStorage.getItem('lybx_comments')) || {};
        this.currentUser = localStorage.getItem('lybx_username') || '访客';
        this.currentProject = null;

        this.init();
    }

    init() {
        this.createInteractionButton();
        this.createInteractionModal();
        this.addProjectLikeButtons();
        this.addBlogInteractions();
        this.bindEvents();
    }

    // 创建交互按钮
    createInteractionButton() {
        const button = document.createElement('button');
        button.className = 'interaction-button';
        button.innerHTML = '💬';
        button.title = '点赞和评论';
        button.setAttribute('aria-label', '打开点赞和评论面板');
        document.body.appendChild(button);

        button.addEventListener('click', () => {
            this.openModal();
        });
    }

    // 创建交互模态框
    createInteractionModal() {
        const modal = document.createElement('div');
        modal.className = 'interaction-modal';
        modal.innerHTML = `
            <div class="interaction-container">
                <div class="interaction-header">
                    <div class="interaction-title">互动中心</div>
                    <button class="interaction-close">×</button>
                </div>
                <div class="interaction-body">
                    <!-- 用户设置 -->
                    <div class="interaction-section">
                        <h3 class="section-heading">用户设置</h3>
                        <div class="user-input-wrapper">
                            <input type="text" class="user-input" placeholder="输入你的昵称..." value="${this.currentUser}">
                            <button class="btn-save-user">保存</button>
                        </div>
                    </div>

                    <!-- 项目列表 -->
                    <div class="interaction-section">
                        <h3 class="section-heading">项目列表</h3>
                        <div class="projects-list" id="projectsList"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;
        this.userInput = modal.querySelector('.user-input');
        this.projectsList = modal.querySelector('#projectsList');

        // 绑定关闭按钮
        modal.querySelector('.interaction-close').addEventListener('click', () => {
            this.closeModal();
        });

        // 点击模态框背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // 绑定保存用户名按钮
        modal.querySelector('.btn-save-user').addEventListener('click', () => {
            this.saveUsername();
        });

        // 渲染项目列表
        this.renderProjects();
    }

    // 打开模态框
    openModal() {
        this.modal.classList.add('active');
        this.renderProjects();
    }

    // 关闭模态框
    closeModal() {
        this.modal.classList.remove('active');
    }

    // 绑定事件
    bindEvents() {
        // ESC关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    // 渲染项目列表
    renderProjects() {
        const projects = [
            'TinySeek',
            'EvidenceFlow-UT',
            'SnakeAI',
            'TinyTorch',
            'AlphaGomoku',
            'Tetris',
            'Big Integer Arithmetic'
        ];

        this.projectsList.innerHTML = '';

        projects.forEach(project => {
            const likeCount = this.likes[project] ? this.likes[project].count : 0;
            const isLiked = this.likes[project] && this.likes[project].users.includes(this.currentUser);
            const commentCount = this.comments[project] ? this.comments[project].length : 0;

            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.innerHTML = `
                <div class="project-info">
                    <div class="project-name">${project}</div>
                    <div class="project-stats">
                        <span class="stat">
                            <span class="stat-icon">${isLiked ? '♥' : '○'}</span>
                            <span class="stat-count">${likeCount}</span>
                        </span>
                        <span class="stat">
                            <span class="stat-icon">💬</span>
                            <span class="stat-count">${commentCount}</span>
                        </span>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn-like ${isLiked ? 'liked' : ''}" data-project="${project}">
                        ${isLiked ? '取消点赞' : '点赞'}
                    </button>
                    <button class="btn-comment" data-project="${project}">
                        评论 (${commentCount})
                    </button>
                </div>
            `;

            this.projectsList.appendChild(projectItem);
        });

        // 绑定事件
        this.projectsList.querySelectorAll('.btn-like').forEach(btn => {
            btn.addEventListener('click', () => {
                this.toggleLike(btn.getAttribute('data-project'));
            });
        });

        this.projectsList.querySelectorAll('.btn-comment').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openCommentDialog(btn.getAttribute('data-project'));
            });
        });
    }

    // 切换点赞
    toggleLike(projectName) {
        if (!this.likes[projectName]) {
            this.likes[projectName] = { count: 0, users: [] };
        }

        const isLiked = this.likes[projectName].users.includes(this.currentUser);

        if (isLiked) {
            this.likes[projectName].count--;
            this.likes[projectName].users = this.likes[projectName].users.filter(user => user !== this.currentUser);
        } else {
            this.likes[projectName].count++;
            this.likes[projectName].users.push(this.currentUser);
        }

        this.saveData();
        this.renderProjects();
        this.updateProjectLikeButtons();

        const message = isLiked ? `已取消点赞 ${projectName}` : `成功点赞 ${projectName}`;
        this.showNotification(message);
    }

    // 打开评论对话框
    openCommentDialog(projectName) {
        const existingDialog = document.querySelector('.comment-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const dialog = document.createElement('div');
        dialog.className = 'comment-dialog';
        dialog.innerHTML = `
            <div class="comment-dialog-content">
                <div class="comment-dialog-header">
                    <h3>${projectName} - 评论</h3>
                    <button class="comment-dialog-close">×</button>
                </div>
                <div class="comments-list" id="commentsList"></div>
                <div class="comment-input-wrapper">
                    <textarea class="comment-input" placeholder="输入你的评论..." rows="3"></textarea>
                    <button class="btn-submit-comment">发送</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 绑定关闭按钮
        dialog.querySelector('.comment-dialog-close').addEventListener('click', () => {
            dialog.remove();
        });

        // 绑定提交按钮
        dialog.querySelector('.btn-submit-comment').addEventListener('click', () => {
            const input = dialog.querySelector('.comment-input');
            const text = input.value.trim();
            if (text) {
                this.addComment(projectName, text);
                input.value = '';
                this.renderComments(projectName);
                this.renderProjects();
            }
        });

        this.renderComments(projectName);
    }

    // 渲染评论列表
    renderComments(projectName) {
        const commentsList = document.querySelector('#commentsList');
        if (!commentsList) return;

        const comments = this.comments[projectName] || [];

        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">暂无评论，快来抢沙发吧！</div>';
            return;
        }

        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const commentItem = document.createElement('div');
            commentItem.className = 'comment-item';
            commentItem.innerHTML = `
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-time">${comment.timestamp}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            `;
            commentsList.appendChild(commentItem);
        });
    }

    // 添加评论
    addComment(projectName, text) {
        if (!this.comments[projectName]) {
            this.comments[projectName] = [];
        }

        this.comments[projectName].push({
            author: this.currentUser,
            text: text,
            timestamp: new Date().toLocaleString()
        });

        this.saveData();
        this.showNotification('评论已添加');
    }

    // 保存用户名
    saveUsername() {
        const newUsername = this.userInput.value.trim();
        if (newUsername) {
            this.currentUser = newUsername;
            localStorage.setItem('lybx_username', newUsername);
            this.showNotification('用户名已保存');
            this.renderProjects();
        }
    }

    // 添加项目点赞按钮
    addProjectLikeButtons() {
        const projectCards = document.querySelectorAll('.project-card');

        projectCards.forEach(card => {
            const projectTitle = card.querySelector('.project-title');
            if (!projectTitle) return;

            const projectName = projectTitle.textContent.trim();
            const likeCount = this.likes[projectName] ? this.likes[projectName].count : 0;
            const isLiked = this.likes[projectName] && this.likes[projectName].users.includes(this.currentUser);

            const likeButton = document.createElement('button');
            likeButton.className = `project-like-button ${isLiked ? 'liked' : ''}`;
            likeButton.innerHTML = `
                <span>${isLiked ? '♥' : '○'}</span>
                <span class="project-like-count">${likeCount}</span>
            `;
            likeButton.setAttribute('data-project', projectName);

            const projectLinks = card.querySelector('.project-links');
            if (projectLinks) {
                projectLinks.appendChild(likeButton);
            }

            likeButton.addEventListener('click', () => {
                this.toggleLike(projectName);
            });
        });
    }

    // 添加博客文章互动功能
    addBlogInteractions() {
        const blogArticles = document.querySelectorAll('.blog-article');

        blogArticles.forEach(article => {
            const blogTitle = article.querySelector('.blog-title');
            if (!blogTitle) return;

            const blogName = blogTitle.textContent.trim();

            // 创建互动容器
            const interactionContainer = document.createElement('div');
            interactionContainer.className = 'blog-interaction';
            interactionContainer.setAttribute('data-blog', blogName);

            // 点赞数和评论数统计
            const likeCount = this.likes[blogName] ? this.likes[blogName].count : 0;
            const isLiked = this.likes[blogName] && this.likes[blogName].users.includes(this.currentUser);
            const commentCount = this.comments[blogName] ? this.comments[blogName].length : 0;

            interactionContainer.innerHTML = `
                <div class="blog-stats">
                    <div class="blog-stat">
                        <span class="blog-stat-icon ${isLiked ? 'liked' : ''}">${isLiked ? '♥' : '○'}</span>
                        <span class="blog-stat-count">${likeCount}</span>
                    </div>
                    <div class="blog-stat">
                        <span class="blog-stat-icon">💬</span>
                        <span class="blog-stat-count">${commentCount}</span>
                    </div>
                </div>
                <div class="blog-actions">
                    <button class="blog-btn-like ${isLiked ? 'liked' : ''}">
                        ${isLiked ? '已点赞' : '点赞'}
                    </button>
                    <button class="blog-btn-comment">
                        评论
                    </button>
                </div>
                <div class="blog-comments-section" style="display: none;">
                    <div class="blog-comments-list"></div>
                    <div class="blog-comment-input-wrapper">
                        <textarea class="blog-comment-input" placeholder="输入你的评论..." rows="3"></textarea>
                        <button class="blog-btn-submit">发送评论</button>
                    </div>
                </div>
            `;

            article.appendChild(interactionContainer);

            // 绑定点赞按钮
            const likeBtn = interactionContainer.querySelector('.blog-btn-like');
            likeBtn.addEventListener('click', () => {
                this.toggleBlogLike(blogName, interactionContainer);
            });

            // 绑定评论按钮
            const commentBtn = interactionContainer.querySelector('.blog-btn-comment');
            const commentsSection = interactionContainer.querySelector('.blog-comments-section');
            commentBtn.addEventListener('click', () => {
                const isVisible = commentsSection.style.display !== 'none';
                commentsSection.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) {
                    this.renderBlogComments(blogName, interactionContainer);
                }
            });

            // 绑定提交评论按钮
            const submitBtn = interactionContainer.querySelector('.blog-btn-submit');
            const commentInput = interactionContainer.querySelector('.blog-comment-input');
            submitBtn.addEventListener('click', () => {
                const text = commentInput.value.trim();
                if (text) {
                    this.addBlogComment(blogName, text);
                    commentInput.value = '';
                    this.renderBlogComments(blogName, interactionContainer);
                    this.updateBlogStats(blogName, interactionContainer);
                }
            });
        });
    }

    // 切换博客点赞
    toggleBlogLike(blogName, container) {
        if (!this.likes[blogName]) {
            this.likes[blogName] = { count: 0, users: [] };
        }

        const isLiked = this.likes[blogName].users.includes(this.currentUser);

        if (isLiked) {
            this.likes[blogName].count--;
            this.likes[blogName].users = this.likes[blogName].users.filter(user => user !== this.currentUser);
        } else {
            this.likes[blogName].count++;
            this.likes[blogName].users.push(this.currentUser);
        }

        this.saveData();
        this.updateBlogStats(blogName, container);

        const message = isLiked ? `已取消点赞 ${blogName}` : `成功点赞 ${blogName}`;
        this.showNotification(message);
    }

    // 添加博客评论
    addBlogComment(blogName, text) {
        if (!this.comments[blogName]) {
            this.comments[blogName] = [];
        }

        this.comments[blogName].push({
            author: this.currentUser,
            text: text,
            timestamp: new Date().toLocaleString()
        });

        this.saveData();
        this.showNotification('评论已添加');
    }

    // 渲染博客评论
    renderBlogComments(blogName, container) {
        const commentsList = container.querySelector('.blog-comments-list');
        const comments = this.comments[blogName] || [];

        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">暂无评论，快来抢沙发吧！</div>';
            return;
        }

        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const commentItem = document.createElement('div');
            commentItem.className = 'blog-comment-item';
            commentItem.innerHTML = `
                <div class="blog-comment-header">
                    <span class="blog-comment-author">${comment.author}</span>
                    <span class="blog-comment-time">${comment.timestamp}</span>
                </div>
                <div class="blog-comment-text">${comment.text}</div>
            `;
            commentsList.appendChild(commentItem);
        });
    }

    // 更新博客统计信息
    updateBlogStats(blogName, container) {
        const likeCount = this.likes[blogName] ? this.likes[blogName].count : 0;
        const isLiked = this.likes[blogName] && this.likes[blogName].users.includes(this.currentUser);
        const commentCount = this.comments[blogName] ? this.comments[blogName].length : 0;

        const statIcon = container.querySelector('.blog-stat-icon');
        const statCount = container.querySelector('.blog-stat-count');
        const commentStatCount = container.querySelectorAll('.blog-stat-count')[1];
        const likeBtn = container.querySelector('.blog-btn-like');

        statIcon.className = `blog-stat-icon ${isLiked ? 'liked' : ''}`;
        statIcon.textContent = isLiked ? '♥' : '○';
        statCount.textContent = likeCount;
        commentStatCount.textContent = commentCount;
        likeBtn.className = `blog-btn-like ${isLiked ? 'liked' : ''}`;
        likeBtn.textContent = isLiked ? '已点赞' : '点赞';
    }

    // 更新项目点赞按钮
    updateProjectLikeButtons() {
        const likeButtons = document.querySelectorAll('.project-like-button');

        likeButtons.forEach(button => {
            const projectName = button.getAttribute('data-project');
            const likeCount = this.likes[projectName] ? this.likes[projectName].count : 0;
            const isLiked = this.likes[projectName] && this.likes[projectName].users.includes(this.currentUser);

            button.className = `project-like-button ${isLiked ? 'liked' : ''}`;
            button.innerHTML = `
                <span>${isLiked ? '♥' : '○'}</span>
                <span class="project-like-count">${likeCount}</span>
            `;
        });
    }

    // 显示通知
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // 保存数据到 localStorage
    saveData() {
        localStorage.setItem('lybx_likes', JSON.stringify(this.likes));
        localStorage.setItem('lybx_comments', JSON.stringify(this.comments));
    }
}

// 初始化交互系统
document.addEventListener('DOMContentLoaded', function() {
    window.simpleInteraction = new SimpleInteraction();
    console.log('交互系统已加载 - 欢迎使用点赞和评论功能');
});
