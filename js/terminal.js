// ============================================
// Terminal System - 评论和点赞功能
// ============================================

class TerminalSystem {
    constructor() {
        this.likes = JSON.parse(localStorage.getItem('lybx_likes')) || {};
        this.comments = JSON.parse(localStorage.getItem('lybx_comments')) || {};
        this.currentUser = localStorage.getItem('lybx_username') || '访客';
        this.currentProject = null;

        this.init();
    }

    init() {
        this.createTerminalButton();
        this.createTerminalModal();
        this.addProjectLikeButtons();
        this.bindEvents();
    }

    // 创建终端按钮
    createTerminalButton() {
        const button = document.createElement('button');
        button.className = 'terminal-button';
        button.innerHTML = '📟';
        button.title = '打开终端';
        button.setAttribute('aria-label', '打开终端');
        document.body.appendChild(button);

        button.addEventListener('click', () => {
            this.openTerminal();
        });
    }

    // 创建终端模态框
    createTerminalModal() {
        const modal = document.createElement('div');
        modal.className = 'terminal-modal';
        modal.innerHTML = `
            <div class="terminal-container">
                <div class="terminal-header">
                    <div class="terminal-title">lybxTerminal v1.0</div>
                    <button class="terminal-close">×</button>
                </div>
                <div class="terminal-body">
                    <div class="terminal-output">
                        <div class="command">绿意不息终端系统启动...</div>
                        <div class="success">✓ 系统加载完成</div>
                        <div class="info">ℹ 欢迎使用评论和点赞系统</div>
                        <div class="result">当前用户: ${this.currentUser}</div>
                        <br>
                    </div>
                </div>
                <div class="terminal-input-container">
                    <span class="terminal-prompt">$</span>
                    <input type="text" class="terminal-input" placeholder="输入命令或 help 查看帮助..." autocomplete="off">
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;
        this.input = modal.querySelector('.terminal-input');
        this.output = modal.querySelector('.terminal-body');

        // 绑定关闭按钮
        modal.querySelector('.terminal-close').addEventListener('click', () => {
            this.closeTerminal();
        });

        // 点击模态框背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeTerminal();
            }
        });
    }

    // 打开终端
    openTerminal() {
        this.modal.classList.add('active');
        this.input.focus();
    }

    // 关闭终端
    closeTerminal() {
        this.modal.classList.remove('active');
    }

    // 绑定事件
    bindEvents() {
        // 输入命令
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const command = this.input.value.trim();
                if (command) {
                    this.executeCommand(command);
                    this.input.value = '';
                }
            }
        });

        // ESC关闭终端
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeTerminal();
            }
        });
    }

    // 执行命令
    executeCommand(command) {
        this.appendOutput(this.input.value, 'command');

        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case 'help':
                this.showHelp();
                break;
            case 'like':
                this.handleLike(args);
                break;
            case 'unlike':
                this.handleUnlike(args);
                break;
            case 'likes':
                this.showLikes(args);
                break;
            case 'comment':
                this.handleComment(args);
                break;
            case 'comments':
                this.showComments(args);
                break;
            case 'user':
                this.changeUsername(args);
                break;
            case 'clear':
                this.clearTerminal();
                break;
            case 'projects':
                this.listProjects();
                break;
            case 'about':
                this.showAbout();
                break;
            default:
                this.appendOutput(`未知命令: ${cmd}. 输入 'help' 查看可用命令。`, 'error');
        }
    }

    // 输出到终端
    appendOutput(text, type = 'result') {
        const output = document.createElement('div');
        output.className = `terminal-output ${type}`;
        output.innerHTML = `<span class="prompt">$</span><span class="result">${text}</span>`;
        this.output.appendChild(output);
        this.output.scrollTop = this.output.scrollHeight;
    }

    // 显示帮助
    showHelp() {
        const help = `
            <div class="terminal-help">
                <div class="terminal-help-title">可用命令:</div>
                <div class="terminal-help-item"><span class="terminal-help-command">help</span><span class="terminal-help-desc">显示帮助信息</span></div>
                <div class="terminal-help-item"><span class="terminal-help-command">projects</span><span class="terminal-help-desc">列出所有项目</span></div>
                <div class="terminal-help-item"><span class="terminal-help-command">like [项目名]</span><span class="terminal-help-desc">点赞项目</span></div>
                <div class="terminal-help-item"><span class="terminal-help-command">unlike [项目名]</span><span class="terminal-help-desc">取消点赞</span></div>
                <div class="terminal-help-item"><span class="terminal-help-command">likes [项目名]</span><span class="terminal-help-desc">查看点赞数</span></div>
                <div class="terminal-help-item"><span class="terminal-help-command">comment [项目名] [评论内容]</span><span class="terminal-help-desc">添加评论</span></div>
                <div class="terminal-help-item"><span class="terminal-help-command">comments [项目名]</span><span class="terminal-help-desc">查看评论</span></div>
                <div class="terminal-help-item"><span class="terminal-help-command">user [用户名]</span><span class="terminal-help-desc">设置用户名</span></div>
                <div class="terminal-help-item"><span class="terminal-help-command">clear</span><span class="terminal-help-desc">清空终端</span></div>
                <div class="terminal-help-item"><span class="terminal-help-command">about</span><span class="terminal-help-desc">关于终端</span></div>
            </div>
        `;

        const output = document.createElement('div');
        output.className = 'terminal-output';
        output.innerHTML = help;
        this.output.appendChild(output);
        this.output.scrollTop = this.output.scrollHeight;
    }

    // 列出所有项目
    listProjects() {
        this.appendOutput('可用项目列表:', 'info');
        const projects = [
            'TinySeek',
            'EvidenceFlow-UT',
            'SnakeAI',
            'TinyTorch',
            'AlphaGomoku',
            'Tetris',
            'Big Integer Arithmetic'
        ];

        projects.forEach(project => {
            const likeCount = this.likes[project] ? this.likes[project].count : 0;
            const isLiked = this.likes[project] && this.likes[project].users.includes(this.currentUser);
            const status = isLiked ? '♥ 已点赞' : '○ 未点赞';
            this.appendOutput(`  • ${project} - ${likeCount} 点赞 ${status}`, 'result');
        });
    }

    // 处理点赞
    handleLike(args) {
        if (args.length === 0) {
            this.appendOutput('请指定项目名称. 用法: like [项目名]', 'error');
            return;
        }

        const projectName = args.join(' ');
        const validProjects = [
            'TinySeek',
            'EvidenceFlow-UT',
            'SnakeAI',
            'TinyTorch',
            'AlphaGomoku',
            'Tetris',
            'Big Integer Arithmetic'
        ];

        if (!validProjects.includes(projectName)) {
            this.appendOutput(`无效的项目名称: ${projectName}`, 'error');
            this.appendOutput('使用 "projects" 命令查看可用项目', 'warning');
            return;
        }

        if (!this.likes[projectName]) {
            this.likes[projectName] = { count: 0, users: [] };
        }

        if (this.likes[projectName].users.includes(this.currentUser)) {
            this.appendOutput(`您已经点赞过 ${projectName} 了`, 'warning');
            return;
        }

        this.likes[projectName].count++;
        this.likes[projectName].users.push(this.currentUser);

        this.saveData();
        this.appendOutput(`✓ 成功点赞 ${projectName}`, 'success');
        this.appendOutput(`当前点赞数: ${this.likes[projectName].count}`, 'info');
        this.updateProjectLikeButtons();
    }

    // 处理取消点赞
    handleUnlike(args) {
        if (args.length === 0) {
            this.appendOutput('请指定项目名称. 用法: unlike [项目名]', 'error');
            return;
        }

        const projectName = args.join(' ');

        if (!this.likes[projectName] || !this.likes[projectName].users.includes(this.currentUser)) {
            this.appendOutput(`您还没有点赞过 ${projectName}`, 'warning');
            return;
        }

        this.likes[projectName].count--;
        this.likes[projectName].users = this.likes[projectName].users.filter(user => user !== this.currentUser);

        this.saveData();
        this.appendOutput(`✓ 已取消点赞 ${projectName}`, 'success');
        this.appendOutput(`当前点赞数: ${this.likes[projectName].count}`, 'info');
        this.updateProjectLikeButtons();
    }

    // 显示点赞数
    showLikes(args) {
        const projectName = args.join(' ');

        if (!projectName) {
            this.appendOutput('项目 点赞数:', 'info');
            const allProjects = Object.keys(this.likes);
            allProjects.forEach(project => {
                this.appendOutput(`  ${project}: ${this.likes[project].count} 点赞`, 'result');
            });
            return;
        }

        if (!this.likes[projectName]) {
            this.appendOutput(`${projectName} 还没有收到任何点赞`, 'warning');
            return;
        }

        this.appendOutput(`${projectName} 的点赞信息:`, 'info');
        this.appendOutput(`  总点赞数: ${this.likes[projectName].count}`, 'result');
        this.appendOutput(`  点赞用户: ${this.likes[projectName].users.join(', ')}`, 'result');
    }

    // 处理评论
    handleComment(args) {
        if (args.length < 2) {
            this.appendOutput('请指定项目名称和评论内容', 'error');
            this.appendOutput('用法: comment [项目名] [评论内容]', 'warning');
            return;
        }

        const projectName = args[0];
        const commentText = args.slice(1).join(' ');

        if (!this.comments[projectName]) {
            this.comments[projectName] = [];
        }

        this.comments[projectName].push({
            author: this.currentUser,
            text: commentText,
            timestamp: new Date().toLocaleString()
        });

        this.saveData();
        this.appendOutput(`✓ 评论已添加到 ${projectName}`, 'success');
    }

    // 显示评论
    showComments(args) {
        const projectName = args.join(' ');

        if (!projectName) {
            this.appendOutput('请指定项目名称', 'error');
            this.appendOutput('用法: comments [项目名]', 'warning');
            return;
        }

        if (!this.comments[projectName] || this.comments[projectName].length === 0) {
            this.appendOutput(`${projectName} 还没有任何评论`, 'warning');
            return;
        }

        this.appendOutput(`${projectName} 的评论:`, 'info');

        const commentsList = document.createElement('div');
        commentsList.className = 'terminal-comments-list';

        this.comments[projectName].forEach((comment, index) => {
            const commentItem = document.createElement('div');
            commentItem.className = 'terminal-comment-item';
            commentItem.innerHTML = `
                <div class="terminal-comment-header">
                    <span class="terminal-comment-author">${comment.author}</span>
                    <span class="terminal-comment-time">${comment.timestamp}</span>
                </div>
                <div class="terminal-comment-text">${comment.text}</div>
            `;
            commentsList.appendChild(commentItem);
        });

        const output = document.createElement('div');
        output.className = 'terminal-output';
        output.appendChild(commentsList);
        this.output.appendChild(output);
        this.output.scrollTop = this.output.scrollHeight;
    }

    // 更改用户名
    changeUsername(args) {
        if (args.length === 0) {
            this.appendOutput('请输入用户名', 'error');
            this.appendOutput('用法: user [用户名]', 'warning');
            return;
        }

        const newUsername = args.join(' ');
        this.currentUser = newUsername;
        localStorage.setItem('lybx_username', newUsername);

        this.appendOutput(`✓ 用户名已更新为: ${newUsername}`, 'success');
    }

    // 清空终端
    clearTerminal() {
        this.output.innerHTML = `
            <div class="terminal-output">
                <div class="command">终端已清空</div>
                <br>
            </div>
        `;
    }

    // 关于终端
    showAbout() {
        const about = `
            <div class="terminal-output">
                <div class="info">═══════════════════════════════════════</div>
                <div class="info">      绿意不息终端系统 v1.0</div>
                <div class="info">═══════════════════════════════════════</div>
                <div class="result">一个用于项目评论和点赞的终端式交互系统</div>
                <div class="result">所有数据存储在本地浏览器中</div>
                <br>
                <div class="success">使用 'help' 命令查看所有可用功能</div>
            </div>
        `;
        this.output.innerHTML += about;
        this.output.scrollTop = this.output.scrollHeight;
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
                this.toggleProjectLike(projectName);
            });
        });
    }

    // 切换项目点赞状态
    toggleProjectLike(projectName) {
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
        this.updateProjectLikeButtons();

        const message = isLiked ? `已取消点赞 ${projectName}` : `成功点赞 ${projectName}`;
        this.showNotification(message);
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
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background-color: var(--primary-color);
            color: white;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10001;
            animation: slideIn 0.3s ease;
            font-size: 14px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // 保存数据到 localStorage
    saveData() {
        localStorage.setItem('lybx_likes', JSON.stringify(this.likes));
        localStorage.setItem('lybx_comments', JSON.stringify(this.comments));
    }
}

// 初始化终端系统
document.addEventListener('DOMContentLoaded', function() {
    window.terminalSystem = new TerminalSystem();
    console.log('终端系统已加载 - 欢迎使用评论和点赞功能');
});
