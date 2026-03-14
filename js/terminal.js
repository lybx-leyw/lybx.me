// ============================================
// Simple Interaction System - 点赞和评论功能
// 基于 Supabase 实现数据共享
// ============================================

// Supabase 配置
const SUPABASE_URL = 'https://aowlaxllqciypommrcgo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvd2xheGxscWNpeXBvbW1yY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODA1MTksImV4cCI6MjA4ODk1NjUxOX0.q8rM0PAC1_GpwrCZBMGnufBCqHruLlHLktadwmLHMhA';

class SimpleInteraction {
    constructor() {
        // 初始化 Supabase 客户端
        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // 本地缓存（用于离线显示）
        this.likes = JSON.parse(localStorage.getItem('lybx_likes')) || {};
        this.comments = JSON.parse(localStorage.getItem('lybx_comments')) || {};

        // 用户唯一标识（解决昵称相同被视为同一人的问题）
        this.userId = localStorage.getItem('lybx_user_id');
        if (!this.userId) {
            this.userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('lybx_user_id', this.userId);
        }


        // 作者身份：根据用户名判断，"绿意不息"为专属作者
        this.isAuthor = false;

        // 用户登录信息
        this.currentUser = localStorage.getItem('lybx_username') || '';
        this.userPassword = localStorage.getItem('lybx_password') || '';
        this.isLoggedIn = localStorage.getItem('lybx_is_logged_in') === 'true';
        this.currentProject = null;

        // 公告栏
        this.announcement = localStorage.getItem('lybx_announcement') || '';

        this.init();
    }

    async init() {
        // 从 Supabase 加载数据
        await this.loadDataFromSupabase();

        // 加载公告
        await this.loadAnnouncement();

        // 检查作者身份（根据当前登录用户）
        await this.checkAuthorStatus();

        this.createInteractionButton();
        this.createInteractionModal();
        this.addProjectLikeButtons();
        this.addBlogInteractions();
        this.bindEvents();

        // 更新作者状态显示
        this.updateAuthorStatus();
    }

    // 加载公告
    async loadAnnouncement() {
        try {
            const { data, error } = await this.supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);

            // 处理错误或无数据的情况
            if (error) {
                console.log('公告表查询错误:', error.message);
                return;
            }

            if (!data || data.length === 0) {
                console.log('暂无公告');
                return;
            }

            const announcementData = data[0];
            if (announcementData && announcementData.content) {
                this.announcement = announcementData.content;
                this.announcementId = announcementData.id;
                localStorage.setItem('lybx_announcement', announcementData.content);
                localStorage.setItem('lybx_announcement_id', announcementData.id);
                this.showAnnouncement(announcementData.content, announcementData.id);
                console.log('公告已加载:', announcementData.content.substring(0, 50) + '...');
            }
        } catch (error) {
            console.error('加载公告失败:', error);
        }
    }

    // 创建公告表
    async createAnnouncementsTable() {
        try {
            await this.supabase.rpc('create_announcements_table', {});
        } catch (error) {
            console.log('公告表创建需要手动在 Supabase 执行');
        }
    }

    // 显示公告
    showAnnouncement(content, announcementId) {
        // 处理换行符
        const formattedContent = this.nl2br(content);

        // 先更新模态框内的公告显示
        const announcementSection = document.querySelector('.announcement-section');
        const announcementContent = document.querySelector('.announcement-content');
        if (announcementSection && announcementContent) {
            announcementContent.innerHTML = formattedContent;
            announcementSection.style.display = 'block';
        }

        // 弹窗公告（使用公告ID检查是否已关闭，而不是内容）
        const dismissedAnnouncementId = localStorage.getItem('lybx_dismissed_announcement_id');
        if (content && announcementId && dismissedAnnouncementId != announcementId) {
            this.showAnnouncementPopup(content, announcementId);
        }
    }

    // 显示弹窗公告
    showAnnouncementPopup(content, announcementId) {
        // 检查是否已有弹窗
        if (document.querySelector('.announcement-popup')) {
            return;
        }

        const popup = document.createElement('div');
        popup.className = 'announcement-popup';
        // 先转义再处理换行符
        const escapedContent = this.escapeHtml(content);
        const formattedContent = escapedContent.replace(/\n/g, '<br>');

        popup.innerHTML = `
            <div class="announcement-popup-content">
                <div class="announcement-popup-header">
                    <span class="announcement-popup-title">📢 公告</span>
                    <button class="announcement-popup-close">×</button>
                </div>
                <div class="announcement-popup-body">
                    ${formattedContent}
                </div>
                <div class="announcement-popup-footer">
                    <label><input type="checkbox" class="announcement-never-show"> 不再显示此公告</label>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // 关闭按钮 - 只是关闭弹窗，不记录为不再显示
        popup.querySelector('.announcement-popup-close').addEventListener('click', () => {
            popup.remove();
        });

        // 点击遮罩关闭 - 只是关闭弹窗
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });

        // 不再显示此公告 - 勾选后关闭弹窗并记录
        popup.querySelector('.announcement-never-show').addEventListener('change', (e) => {
            if (e.target.checked) {
                popup.remove();
                localStorage.setItem('lybx_dismissed_announcement_id', announcementId);
            }
        });
    }

    // 更新作者状态显示
    updateAuthorStatus() {
        if (this.authorStatus) {
            this.authorStatus.style.display = this.isAuthor ? 'block' : 'none';
        }
    }

    // 从 Supabase 加载数据
    async loadDataFromSupabase() {
        try {
            // 加载 likes
            const { data: likesData, error: likesError } = await this.supabase
                .from('likes')
                .select('*');

            if (likesError) throw likesError;

            // 处理 likes 数据
            this.likes = {};
            likesData.forEach(like => {
                const key = like.target_name;
                if (!this.likes[key]) {
                    this.likes[key] = { count: 0, users: [], userIds: [] };
                }
                this.likes[key].count++;
                this.likes[key].users.push(like.username);
                // 加载 userId（兼容旧数据）
                if (like.user_id) {
                    if (!this.likes[key].userIds) {
                        this.likes[key].userIds = [];
                    }
                    this.likes[key].userIds.push(like.user_id);
                }
            });

            // 加载 comments
            const { data: commentsData, error: commentsError } = await this.supabase
                .from('comments')
                .select('*')
                .order('created_at', { ascending: true });

            if (commentsError) throw commentsError;

            // 处理 comments 数据
            this.comments = {};
            commentsData.forEach(comment => {
                const key = comment.target_name;
                if (!this.comments[key]) {
                    this.comments[key] = [];
                }
                this.comments[key].push({
                    id: comment.id,  // 保存评论的唯一ID
                    author: comment.username,
                    user_id: comment.user_id,
                    text: comment.content,
                    timestamp: new Date(comment.created_at).toLocaleString()
                });
            });

            // 保存到本地缓存
            this.saveData();
            console.log('数据已从 Supabase 加载');

            // 刷新界面显示
            this.refreshAllViews();

        } catch (error) {
            console.error('从 Supabase 加载数据失败:', error);
            // 使用本地缓存数据
        }
    }

    // 刷新所有视图
    refreshAllViews() {
        if (this.projectsList) {
            this.renderProjects();
        }
        this.updateProjectLikeButtons();

        // 刷新博客互动
        const blogInteractions = document.querySelectorAll('.blog-interaction');
        blogInteractions.forEach(container => {
            const blogName = container.getAttribute('data-blog');
            this.updateBlogStats(blogName, container);
        });
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

        // 根据登录状态显示不同内容
        const authSection = this.isLoggedIn ? this.getLoggedInSection() : this.getLoginSection();

        modal.innerHTML = `
            <div class="interaction-container">
                <div class="interaction-header">
                    <div class="interaction-title">互动中心</div>
                    <button class="interaction-close">×</button>
                </div>
                <div class="interaction-body">
                    <!-- 公告栏 -->
                    <div class="interaction-section announcement-section" id="announcementSection" style="display: none;">
                        <div class="announcement-banner">📢 公告</div>
                        <div class="announcement-content" id="announcementContent"></div>
                    </div>

                    ${authSection}

                    <!-- 项目列表 -->
                    <div class="interaction-section" id="projectsSection" style="display: none;">
                        <h3 class="section-heading">项目列表</h3>
                        <div class="projects-list" id="projectsList"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;
        this.userInput = modal.querySelector('.user-input');
        this.passwordInput = modal.querySelector('.password-input');
        this.projectsList = modal.querySelector('#projectsList');
        this.authorStatus = modal.querySelector('.author-status');
        this.announcementSection = modal.querySelector('#announcementSection');
        this.announcementContent = modal.querySelector('#announcementContent');
        this.projectsSection = modal.querySelector('#projectsSection');

        // 如果已登录，显示项目列表
        if (this.isLoggedIn) {
            this.showProjectsSection();
        }

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

        // 绑定保存用户名按钮（仅旧版界面需要）
        const saveUserBtn = modal.querySelector('.btn-save-user');
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', () => {
                this.saveUsername();
            });
        }


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

    // 获取登录/注册界面
    getLoginSection() {
        const escapedUser = this.escapeHtml(this.currentUser);
        return `
            <div class="interaction-section auth-section">
                <h3 class="section-heading">登录 / 注册</h3>
                <p class="auth-note">"绿意不息" 为作者专属昵称，其他用户请先注册</p>
                <div class="user-input-wrapper">
                    <input type="text" class="user-input" placeholder="输入你的昵称..." value="${escapedUser}">
                </div>
                <div class="user-input-wrapper">
                    <input type="password" class="password-input" placeholder="输入密码...">
                </div>
                <div class="auth-buttons">
                    <button class="btn-login">登录</button>
                    <button class="btn-register">注册</button>
                </div>
                <div class="login-error" style="color: red; display: none; margin-top: 10px;"></div>
            </div>
        `;
    }

    // 获取已登录界面
    getLoggedInSection() {
        const escapedUser = this.escapeHtml(this.currentUser);
        
        // 作者管理区域
        const authorSection = this.isAuthor ? `
            <div class="author-manage-section">
                <h4 class="section-subheading">👑 作者管理</h4>
                
                <div class="announcement-manage">
                    <h5>公告管理</h5>
                    <textarea class="announcement-input" id="authorAnnouncement" placeholder="输入公告内容..." rows="3">${this.escapeHtml(this.announcement)}</textarea>
                    <div class="announcement-buttons">
                        <button class="btn-publish-announcement">发布公告</button>
                        <button class="btn-clear-announcement">清除公告</button>
                    </div>
                </div>
            </div>
        ` : '';

        return `
            <div class="interaction-section">
                <h3 class="section-heading">当前用户: ${escapedUser}</h3>
                <div class="user-info">
                    <span class="user-badge">✓ 已登录</span>
                    <button class="btn-logout">退出登录</button>
                </div>
                ${this.isAuthor ? '<div class="author-status"><span class="author-badge">✓ 作者认证</span></div>' : ''}
                ${authorSection}
            </div>
        `;
    }

    // HTML转义防止XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 将换行符转换为HTML
    nl2br(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    }

    // 显示项目列表区域
    showProjectsSection() {
        if (this.projectsSection) {
            this.projectsSection.style.display = 'block';
        }
    }

    // 绑定事件
    bindEvents() {
        const modal = this.modal;
        console.log('bindEvents 被调用，modal:', modal);

        // ESC关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closeModal();
            }
        });

        // 登录按钮
        const loginBtn = modal.querySelector('.btn-login');
        console.log('登录按钮:', loginBtn);
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                console.log('登录按钮被点击');
                e.preventDefault();
                this.handleLogin();
            });
        }

        // 注册按钮
        const registerBtn = modal.querySelector('.btn-register');
        console.log('注册按钮:', registerBtn);
        if (registerBtn) {
            registerBtn.addEventListener('click', (e) => {
                console.log('注册按钮被点击');
                e.preventDefault();
                this.handleRegister();
            });
        }

        // 退出登录按钮
        const logoutBtn = modal.querySelector('.btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // 作者管理按钮
        const publishBtn = modal.querySelector('.btn-publish-announcement');
        if (publishBtn) {
            publishBtn.addEventListener('click', () => this.publishAnnouncement());
        }

        const clearBtn = modal.querySelector('.btn-clear-announcement');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAnnouncement());
        }
    }

    // 发布公告
    async publishAnnouncement() {
        if (!this.isAuthor) {
            this.showNotification('只有作者才能发布公告');
            return;
        }

        const announcementInput = this.modal.querySelector('.announcement-input');
        const content = announcementInput.value.trim();

        if (!content) {
            this.showNotification('请输入公告内容');
            return;
        }

        try {
            // 检查是否已有公告
            const { data: existing } = await this.supabase
                .from('announcements')
                .select('id')
                .limit(1)
                .single();

            let announcementId;
            if (existing) {
                // 更新公告
                await this.supabase
                    .from('announcements')
                    .update({ content: content, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
                announcementId = existing.id;
            } else {
                // 创建新公告并获取返回的ID
                const { data: inserted } = await this.supabase
                    .from('announcements')
                    .insert({ content: content })
                    .select()
                    .single();
                announcementId = inserted?.id;
            }

            this.announcement = content;
            this.announcementId = announcementId;
            localStorage.setItem('lybx_announcement', content);
            localStorage.setItem('lybx_announcement_id', announcementId);
            // 清除之前关闭的公告ID，这样新公告会弹出
            localStorage.removeItem('lybx_dismissed_announcement_id');
            this.showNotification('公告已发布！');

            // 更新前端显示
            this.showAnnouncement(content, announcementId);
            this.refreshModal();
        } catch (error) {
            console.error('发布公告失败:', error);
            this.showNotification('发布失败，请稍后重试');
        }
    }

    // 清除公告
    async clearAnnouncement() {
        if (!this.isAuthor) {
            this.showNotification('只有作者才能清除公告');
            return;
        }

        try {
            await this.supabase
                .from('announcements')
                .delete()
                .neq('id', 0);

            this.announcement = '';
            localStorage.removeItem('lybx_announcement');
            this.showNotification('公告已清除');
            
            // 隐藏前端显示
            const announcementSection = document.querySelector('.announcement-section');
            if (announcementSection) {
                announcementSection.style.display = 'none';
            }
            this.refreshModal();
        } catch (error) {
            console.error('清除公告失败:', error);
            this.showNotification('清除失败，请稍后重试');
        }
    }

    // 处理登录
    async handleLogin() {
        const username = this.modal.querySelector('.user-input').value.trim();
        const password = this.modal.querySelector('.password-input').value;
        const errorDiv = this.modal.querySelector('.login-error');

        if (!username || !password) {
            errorDiv.textContent = '请输入昵称和密码';
            errorDiv.style.display = 'block';
            return;
        }

        // 检查是否为作者专属昵称（仅限制普通用户注册，登录不受限制）
        // "绿意不息" 可以通过作者ID验证来获得作者权限

        try {
            // 从 users 表查询用户
            console.log('尝试登录，用户名:', username);
            
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();

            console.log('查询结果:', { data, error });

            if (error) {
                errorDiv.textContent = '查询用户失败: ' + error.message;
                errorDiv.style.display = 'block';
                return;
            }
            
            if (!data) {
                errorDiv.textContent = '用户不存在，请先注册';
                errorDiv.style.display = 'block';
                return;
            }

            // 验证密码
            if (data.password !== password) {
                errorDiv.textContent = '密码错误';
                errorDiv.style.display = 'block';
                return;
            }

            // 登录成功
            this.currentUser = username;
            this.userId = data.user_id;
            this.isLoggedIn = true;
            localStorage.setItem('lybx_username', username);
            localStorage.setItem('lybx_password', password);
            localStorage.setItem('lybx_user_id', data.user_id);
            localStorage.setItem('lybx_is_logged_in', 'true');

            // 检查是否为作者（通过查询author_ids表）
            await this.checkAuthorStatus();

            const authorMsg = this.isAuthor ? '（作者身份已认证）' : '';
            this.showNotification('登录成功！' + authorMsg);
            this.refreshModal();
            this.renderProjects();
            this.updateProjectLikeButtons();
            this.updateAllBlogStats();

        } catch (error) {
            console.error('登录失败:', error);
            errorDiv.textContent = '登录失败，请稍后重试';
            errorDiv.style.display = 'block';
        }
    }

    // 处理注册
    async handleRegister() {
        const username = this.modal.querySelector('.user-input').value.trim();
        const password = this.modal.querySelector('.password-input').value;
        const errorDiv = this.modal.querySelector('.login-error');

        if (!username || !password) {
            errorDiv.textContent = '请输入昵称和密码';
            errorDiv.style.display = 'block';
            return;
        }

        if (username.length < 2) {
            errorDiv.textContent = '昵称至少需要2个字符';
            errorDiv.style.display = 'block';
            return;
        }

        if (password.length < 4) {
            errorDiv.textContent = '密码至少需要4个字符';
            errorDiv.style.display = 'block';
            return;
        }

        // 检查是否为作者专属昵称
        if (username === '绿意不息') {
            errorDiv.textContent = '此昵称为作者专属，无法注册';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            console.log('尝试注册，用户名:', username);
            
            // 检查昵称是否已被使用
            const { data: existing, error: checkError } = await this.supabase
                .from('users')
                .select('username')
                .eq('username', username)
                .single();

            console.log('检查结果:', { existing, checkError });

            if (checkError && checkError.code !== 'PGRST116') {
                // PGRST116 = no rows returned, 这是正常的
                errorDiv.textContent = '检查用户失败: ' + checkError.message;
                errorDiv.style.display = 'block';
                return;
            }

            if (existing) {
                errorDiv.textContent = '该昵称已被注册';
                errorDiv.style.display = 'block';
                return;
            }

            // 生成新的 userId
            const newUserId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            console.log('创建用户，ID:', newUserId);

            // 创建新用户
            const { error: insertError } = await this.supabase
                .from('users')
                .insert({
                    username: username,
                    password: password,
                    user_id: newUserId
                });

            console.log('插入结果:', { insertError });
            
            if (insertError) {
                errorDiv.textContent = '注册失败: ' + insertError.message;
                errorDiv.style.display = 'block';
                return;
            }

            // 注册成功，自动登录
            this.currentUser = username;
            this.userId = newUserId;
            this.isLoggedIn = true;
            localStorage.setItem('lybx_username', username);
            localStorage.setItem('lybx_password', password);
            localStorage.setItem('lybx_user_id', newUserId);
            localStorage.setItem('lybx_is_logged_in', 'true');

            this.showNotification('注册成功！已自动登录');
            this.refreshModal();
            this.renderProjects();
            this.updateProjectLikeButtons();
            this.updateAllBlogStats();

        } catch (error) {
            console.error('注册失败:', error);
            errorDiv.textContent = '注册失败，请稍后重试';
            errorDiv.style.display = 'block';
        }
    }

    // 处理退出登录
    handleLogout() {
        this.currentUser = '';
        this.userPassword = '';
        this.isLoggedIn = false;
        localStorage.removeItem('lybx_username');
        localStorage.removeItem('lybx_password');
        localStorage.removeItem('lybx_is_logged_in');

        this.showNotification('已退出登录');
        this.refreshModal();
    }

    // 刷新模态框
    refreshModal() {
        this.modal.remove();
        this.createInteractionModal();
        this.bindEvents();
    }

    // 更新所有博客统计
    updateAllBlogStats() {
        const blogInteractions = document.querySelectorAll('.blog-interaction');
        blogInteractions.forEach(container => {
            const blogName = container.getAttribute('data-blog');
            this.updateBlogStats(blogName, container);
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
    async toggleLike(projectName) {
        // 检查是否登录
        if (!this.isLoggedIn || !this.currentUser) {
            this.showNotification('请先登录后再点赞！');
            this.openModal();
            return;
        }

        if (!this.likes[projectName]) {
            this.likes[projectName] = { count: 0, users: [], userIds: [] };
        }

        // 使用 userId 判断是否已点赞（解决昵称相同被视为同一人的问题）
        const isLiked = this.likes[projectName].userIds && this.likes[projectName].userIds.includes(this.userId);

        try {
            if (isLiked) {
                // 取消点赞 - 从 Supabase 删除
                await this.supabase
                    .from('likes')
                    .delete()
                    .eq('target_type', 'project')
                    .eq('target_name', projectName)
                    .eq('user_id', this.userId);

                this.likes[projectName].count--;
                this.likes[projectName].userIds = this.likes[projectName].userIds.filter(id => id !== this.userId);
                // 同时也移除旧的昵称记录（兼容旧数据）
                this.likes[projectName].users = this.likes[projectName].users.filter(user => user !== this.currentUser);
            } else {
                // 点赞 - 插入到 Supabase
                await this.supabase
                    .from('likes')
                    .insert({ 
                        target_type: 'project', 
                        target_name: projectName, 
                        username: this.currentUser,
                        user_id: this.userId
                    });

                this.likes[projectName].count++;
                this.likes[projectName].users.push(this.currentUser);
                if (!this.likes[projectName].userIds) {
                    this.likes[projectName].userIds = [];
                }
                this.likes[projectName].userIds.push(this.userId);
            }

            this.saveData();
            this.renderProjects();
            this.updateProjectLikeButtons();

            const message = isLiked ? `已取消点赞 ${projectName}` : `成功点赞 ${projectName}`;
            this.showNotification(message);
        } catch (error) {
            console.error('点赞操作失败:', error);
            this.showNotification('操作失败，请稍后重试');
        }
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
        dialog.querySelector('.btn-submit-comment').addEventListener('click', async () => {
            // 检查是否登录
            if (!this.isLoggedIn || !this.currentUser) {
                this.showNotification('请先登录后再评论！');
                dialog.remove();
                this.openModal();
                return;
            }
            
            const input = dialog.querySelector('.comment-input');
            const text = input.value.trim();
            if (text) {
                input.value = '';
                await this.addComment(projectName, text);
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
        comments.forEach((comment, index) => {
            const commentItem = document.createElement('div');
            commentItem.className = 'comment-item';
            
            // 检查是否可以删除（作者或评论作者）
            const canDelete = this.isAuthor || (comment.user_id === this.userId);
            const deleteBtn = canDelete ? `<button class="btn-delete-comment" data-index="${index}" data-project="${projectName}" data-user-id="${comment.user_id}">删除</button>` : '';
            
            commentItem.innerHTML = `
                <div class="comment-header">
                    <span class="comment-author">${this.escapeHtml(comment.author)}</span>
                    <span class="comment-time">${comment.timestamp}</span>
                    ${deleteBtn}
                </div>
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            `;
            commentsList.appendChild(commentItem);
        });

        // 绑定删除按钮事件
        commentsList.querySelectorAll('.btn-delete-comment').forEach(btn => {
            btn.addEventListener('click', async () => {
                const projectName = btn.getAttribute('data-project');
                const userId = btn.getAttribute('data-user-id');
                const index = parseInt(btn.getAttribute('data-index'));
                await this.deleteComment(projectName, userId, index);
            });
        });
    }

    // 添加评论
    async addComment(projectName, text, callback) {
        try {
            // 插入到 Supabase 并获取返回的ID
            const { data, error } = await this.supabase
                .from('comments')
                .insert({
                    target_type: 'project',
                    target_name: projectName,
                    username: this.currentUser,
                    user_id: this.userId,  // 使用唯一ID区分用户
                    content: text
                })
                .select()
                .single();

            if (error) throw error;

            if (!this.comments[projectName]) {
                this.comments[projectName] = [];
            }

            this.comments[projectName].push({
                id: data.id,  // 保存评论的唯一ID
                author: this.currentUser,
                user_id: this.userId,
                text: text,
                timestamp: new Date().toLocaleString()
            });

            this.saveData();
            this.showNotification('评论已添加');

            // 刷新评论显示
            this.renderComments(projectName);

            // 执行回调（如有）
            if (callback) callback();
        } catch (error) {
            console.error('评论添加失败:', error);
            this.showNotification('评论失败，请稍后重试');
        }
    }

    // 删除评论
    async deleteComment(projectName, userId, index) {
        if (!this.isAuthor && userId !== this.userId) {
            this.showNotification('你没有权限删除此评论');
            return;
        }

        try {
            // 获取要删除的评论的唯一ID
            const comments = this.comments[projectName] || [];
            const commentToDelete = comments[index];

            if (!commentToDelete || !commentToDelete.id) {
                // 如果没有唯一ID，使用旧的匹配方式
                await this.supabase
                    .from('comments')
                    .delete()
                    .eq('target_name', projectName)
                    .eq('user_id', userId);
            } else {
                // 使用唯一ID删除
                await this.supabase
                    .from('comments')
                    .delete()
                    .eq('id', commentToDelete.id);
            }

            // 从本地删除
            if (this.comments[projectName]) {
                this.comments[projectName].splice(index, 1);
            }

            this.saveData();
            this.showNotification('评论已删除');
            
            // 刷新评论显示
            this.renderComments(projectName);
            this.renderProjects();
            
            // 刷新博客评论
            this.refreshAllViews();
        } catch (error) {
            console.error('删除评论失败:', error);
            this.showNotification('删除失败，请稍后重试');
        }
    }

    // 保存用户名（检查昵称唯一性）
    async saveUsername() {
        const newUsername = this.userInput.value.trim();
        if (!newUsername) {
            this.showNotification('请输入昵称');
            return;
        }

        // 检查昵称是否已被使用（通过查询 likes 和 comments 表）
        try {
            const { data: existingLikes, error: likesError } = await this.supabase
                .from('likes')
                .select('username, user_id')
                .eq('username', newUsername);

            const { data: existingComments, error: commentsError } = await this.supabase
                .from('comments')
                .select('username, user_id')
                .eq('username', newUsername);

            if (likesError || commentsError) {
                console.error('检查昵称失败', likesError || commentsError);
            }

            // 如果昵称已被使用，且不是当前用户
            const existingUsers = [...(existingLikes || []), ...(existingComments || [])];
            const isTaken = existingUsers.some(u => u.user_id !== this.userId);

            if (isTaken) {
                this.showNotification('该昵称已被使用，请更换');
                return;
            }

            this.currentUser = newUsername;
            localStorage.setItem('lybx_username', newUsername);
            this.showNotification('用户名已保存');
            this.renderProjects();
            this.updateProjectLikeButtons();

            // 刷新博客互动显示
            const blogInteractions = document.querySelectorAll('.blog-interaction');
            blogInteractions.forEach(container => {
                const blogName = container.getAttribute('data-blog');
                this.updateBlogStats(blogName, container);
            });
        } catch (error) {
            console.error('保存用户名失败:', error);
            this.showNotification('保存失败，请稍后重试');
        }
    }

    // 检查作者身份状态（登录时自动调用）
    async checkAuthorStatus() {
        // 直接根据用户名判断，"绿意不息"为专属作者
        if (this.currentUser === '绿意不息') {
            this.isAuthor = true;
        } else {
            this.isAuthor = false;
        }
        this.updateAuthorStatus();
    }

    // 确保公告表存在
    async ensureAnnouncementsTable() {
        try {
            const { error } = await this.supabase
                .from('announcements')
                .select('id')
                .limit(1);

            if (error && error.code === '42P01') {
                console.log('公告表不存在，需要在Supabase中创建');
            }
        } catch (e) {
            console.log('检查公告表失败');
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
            const isLiked = this.likes[projectName] && this.likes[projectName].userIds && this.likes[projectName].userIds.includes(this.userId);

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
            if (!blogTitle) {
                console.log('未找到博客标题元素');
                return;
            }

            const blogName = blogTitle.textContent.trim();
            console.log('为博客文章添加互动:', blogName);

            // 创建互动容器
            const interactionContainer = document.createElement('div');
            interactionContainer.className = 'blog-interaction';
            interactionContainer.setAttribute('data-blog', blogName);

            // 点赞数和评论数统计（使用 userId 判断）
            const likeCount = this.likes[blogName] ? this.likes[blogName].count : 0;
            const isLiked = this.likes[blogName] && this.likes[blogName].userIds && this.likes[blogName].userIds.includes(this.userId);
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
            submitBtn.addEventListener('click', async () => {
                // 检查是否登录
                if (!this.isLoggedIn || !this.currentUser) {
                    this.showNotification('请先登录后再评论！');
                    this.openModal();
                    return;
                }
                
                const text = commentInput.value.trim();
                if (text) {
                    commentInput.value = '';
                    await this.addBlogComment(blogName, text);
                    this.updateBlogStats(blogName, interactionContainer);
                }
            });
        });
    }

    // 切换博客点赞
    async toggleBlogLike(blogName, container) {
        // 检查是否登录
        if (!this.isLoggedIn || !this.currentUser) {
            this.showNotification('请先登录后再点赞！');
            this.openModal();
            return;
        }

        if (!this.likes[blogName]) {
            this.likes[blogName] = { count: 0, users: [], userIds: [] };
        }

        // 使用 userId 判断是否已点赞
        const isLiked = this.likes[blogName].userIds && this.likes[blogName].userIds.includes(this.userId);

        try {
            if (isLiked) {
                // 取消点赞
                await this.supabase
                    .from('likes')
                    .delete()
                    .eq('target_type', 'blog')
                    .eq('target_name', blogName)
                    .eq('user_id', this.userId);

                this.likes[blogName].count--;
                this.likes[blogName].userIds = this.likes[blogName].userIds.filter(id => id !== this.userId);
                this.likes[blogName].users = this.likes[blogName].users.filter(user => user !== this.currentUser);
            } else {
                // 点赞
                await this.supabase
                    .from('likes')
                    .insert({ 
                        target_type: 'blog', 
                        target_name: blogName, 
                        username: this.currentUser,
                        user_id: this.userId
                    });

                this.likes[blogName].count++;
                this.likes[blogName].users.push(this.currentUser);
                if (!this.likes[blogName].userIds) {
                    this.likes[blogName].userIds = [];
                }
                this.likes[blogName].userIds.push(this.userId);
            }

            this.saveData();
            this.updateBlogStats(blogName, container);

            const message = isLiked ? `已取消点赞 ${blogName}` : `成功点赞 ${blogName}`;
            this.showNotification(message);
        } catch (error) {
            console.error('博客点赞操作失败:', error);
            this.showNotification('操作失败，请稍后重试');
        }
    }

    // 添加博客评论
    async addBlogComment(blogName, text, callback) {
        try {
            const { data } = await this.supabase
                .from('comments')
                .insert({
                    target_type: 'blog',
                    target_name: blogName,
                    username: this.currentUser,
                    user_id: this.userId,
                    content: text
                })
                .select()
                .single();

            if (!this.comments[blogName]) {
                this.comments[blogName] = [];
            }

            this.comments[blogName].push({
                id: data.id,  // 保存评论的唯一ID
                author: this.currentUser,
                user_id: this.userId,
                text: text,
                timestamp: new Date().toLocaleString()
            });

            this.saveData();
            this.showNotification('评论已添加');

            // 刷新评论显示
            const container = document.querySelector(`.blog-interaction[data-blog="${blogName}"]`);
            if (container) {
                this.renderBlogComments(blogName, container);
            }

            if (callback) callback();
        } catch (error) {
            console.error('博客评论添加失败:', error);
            this.showNotification('评论失败，请稍后重试');
        }
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
        comments.forEach((comment, index) => {
            const commentItem = document.createElement('div');
            commentItem.className = 'blog-comment-item';
            
            // 检查是否可以删除（作者或评论作者）
            const canDelete = this.isAuthor || (comment.user_id === this.userId);
            const deleteBtn = canDelete ? `<button class="btn-blog-delete-comment" data-blog="${blogName}" data-user-id="${comment.user_id}" data-index="${index}">删除</button>` : '';
            
            commentItem.innerHTML = `
                <div class="blog-comment-header">
                    <span class="blog-comment-author">${this.escapeHtml(comment.author)}</span>
                    <span class="blog-comment-time">${comment.timestamp}</span>
                    ${deleteBtn}
                </div>
                <div class="blog-comment-text">${this.escapeHtml(comment.text)}</div>
            `;
            commentsList.appendChild(commentItem);
        });

        // 绑定博客评论删除按钮
        commentsList.querySelectorAll('.btn-blog-delete-comment').forEach(btn => {
            btn.addEventListener('click', async () => {
                const blogName = btn.getAttribute('data-blog');
                const userId = btn.getAttribute('data-user-id');
                const index = parseInt(btn.getAttribute('data-index'));
                await this.deleteBlogComment(blogName, userId, index);
            });
        });
    }

    // 删除博客评论
    async deleteBlogComment(blogName, userId, index) {
        if (!this.isAuthor && userId !== this.userId) {
            this.showNotification('你没有权限删除此评论');
            return;
        }

        try {
            // 获取要删除的评论的唯一ID
            const comments = this.comments[blogName] || [];
            const commentToDelete = comments[index];

            if (!commentToDelete || !commentToDelete.id) {
                // 如果没有唯一ID，使用旧的匹配方式
                await this.supabase
                    .from('comments')
                    .delete()
                    .eq('target_name', blogName)
                    .eq('user_id', userId);
            } else {
                // 使用唯一ID删除
                await this.supabase
                    .from('comments')
                    .delete()
                    .eq('id', commentToDelete.id);
            }

            // 从本地删除
            if (this.comments[blogName]) {
                this.comments[blogName].splice(index, 1);
            }

            this.saveData();
            this.showNotification('评论已删除');
            
            // 刷新显示
            const container = document.querySelector(`.blog-interaction[data-blog="${blogName}"]`);
            if (container) {
                this.renderBlogComments(blogName, container);
                this.updateBlogStats(blogName, container);
            }
            this.renderProjects();
        } catch (error) {
            console.error('删除评论失败:', error);
            this.showNotification('删除失败，请稍后重试');
        }
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
