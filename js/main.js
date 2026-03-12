// ============================================
// JavaScript - 交互功能
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // 暗黑模式切换
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    const toggleIcon = darkModeToggle.querySelector('.icon');
    const toggleText = darkModeToggle.querySelector('.text');

    // 检查本地存储中的暗黑模式设置
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        body.classList.add('dark-mode');
        toggleIcon.textContent = '☀️';
        toggleText.textContent = '明亮模式';
    }

    darkModeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-mode');

        if (body.classList.contains('dark-mode')) {
            toggleIcon.textContent = '☀️';
            toggleText.textContent = '明亮模式';
            localStorage.setItem('darkMode', 'true');
        } else {
            toggleIcon.textContent = '🌙';
            toggleText.textContent = '深度模式';
            localStorage.setItem('darkMode', 'false');
        }
    });

    // 平滑滚动到锚点
    const navLinks = document.querySelectorAll('.nav-menu a');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // 只处理锚点链接
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(href);

                if (targetSection) {
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    const targetPosition = targetSection.offsetTop - headerHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
            // 非锚点链接（如 learning-journey.html）让其正常跳转
        });
    });

    // 滚动时高亮当前导航
    const sections = document.querySelectorAll('section[id]');
    const navMenu = document.querySelector('.nav-menu');

    window.addEventListener('scroll', function() {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            const headerHeight = document.querySelector('.header').offsetHeight;

            if (scrollY >= sectionTop - headerHeight - 100) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });

    // 项目卡片淡入动画
    const projectCards = document.querySelectorAll('.project-card');

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    projectCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        observer.observe(card);
    });

    // 愿景块淡入动画
    const visionBlocks = document.querySelectorAll('.vision-block');

    visionBlocks.forEach((block, index) => {
        block.style.animationDelay = `${index * 0.2}s`;
        observer.observe(block);
    });

    // 响应式导航菜单
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger';
    hamburger.innerHTML = '<span></span><span></span><span></span>';

    if (window.innerWidth <= 768) {
        const nav = document.querySelector('.nav');
        if (!document.querySelector('.hamburger')) {
            nav.insertBefore(hamburger, navMenu);
            navMenu.classList.add('nav-menu-hidden');
        }
    }

    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('nav-menu-hidden');
        hamburger.classList.toggle('active');
    });

    // 添加活动导航样式
    const style = document.createElement('style');
    style.textContent = `
        .nav-menu a.active {
            color: var(--primary-color) !important;
        }

        .nav-menu a.active::after {
            width: 100% !important;
        }

        .hamburger {
            display: none;
            flex-direction: column;
            justify-content: space-around;
            width: 30px;
            height: 25px;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
            z-index: 10;
        }

        .hamburger span {
            width: 100%;
            height: 3px;
            background: var(--primary-color);
            border-radius: 3px;
            transition: all 0.3s ease;
        }

        .hamburger.active span:nth-child(1) {
            transform: rotate(45deg) translate(8px, 8px);
        }

        .hamburger.active span:nth-child(2) {
            opacity: 0;
        }

        .hamburger.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -7px);
        }

        .nav-menu-hidden {
            display: none !important;
        }

        @media (max-width: 768px) {
            .nav-menu {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                flex-direction: column;
                background: white;
                padding: 1rem 2rem;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                border-top: 1px solid var(--border-color);
            }

            .nav-menu-hidden {
                display: none !important;
            }

            .hamburger {
                display: flex;
            }
        }
    `;
    document.head.appendChild(style);
});

// 添加滚动进度指示器
window.addEventListener('scroll', function() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;

    let progressBar = document.querySelector('.progress-bar');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: var(--primary-color);
            z-index: 1001;
            transition: width 0.1s ease;
        `;
        document.body.appendChild(progressBar);
    }

    progressBar.style.width = scrolled + '%';
});

console.log('网站已加载 - 绿意不息的AI与心理探索之旅');
