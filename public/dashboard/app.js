let isNavOpen = false;

document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initStatsCounters();
    initAnimations();
    window.addEventListener('scroll', handleScroll);
    loadCodeFont();

    const scrollProjectBeton = document.getElementById('scrollProjectBeton');
    scrollProjectBeton.addEventListener('click', () => {
        scrollToProjects();
    });
});

function loadCodeFont() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap';
    document.head.appendChild(link);
}

function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            isNavOpen = !isNavOpen;
            navToggle.classList.toggle('active', isNavOpen);
            navMenu.classList.toggle('active', isNavOpen);
            document.body.style.overflow = isNavOpen ? 'hidden' : '';
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (isNavOpen) {
                isNavOpen = false;
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

function scrollToProjects() {
    const projectsSection = document.getElementById("projects");
    if (projectsSection) {
        projectsSection.scrollIntoView({ behavior: "smooth" });
    }
}

function handleScroll() {
    const navbar = document.querySelector('.navbar');
    const scrollPosition = window.scrollY;

    if (navbar) {
        if (scrollPosition > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

function initStatsCounters() {
    const statNumbers = document.querySelectorAll('.stat-number');

    if (!statNumbers.length) return;
    observeStatsSection();
}

function observeStatsSection() {
    const statsSection = document.querySelector('.stats-section');

    if (!statsSection) return;

    if (!window.IntersectionObserver) {
        setTimeout(() => {
            animateStatNumbers();
        }, 1000);
        return;
    }

    const observer = new IntersectionObserver(
        entries => {
            if (entries[0].isIntersecting) {
                animateStatNumbers();
                observer.unobserve(statsSection); 
            }
        },
        { threshold: 0.3 }
    );

    observer.observe(statsSection);
}

function animateStatNumbers() {
    const statNumbers = document.querySelectorAll('.stat-number');

    statNumbers.forEach(statNumber => {
        const target = parseFloat(statNumber.dataset.target);
        const suffix = statNumber.dataset.suffix || '';
        const duration = 2000;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = target / steps;

        let current = 0;

        const counter = setInterval(() => {
            current += increment;

            let formattedNumber;
            if (Number.isInteger(target)) {
                formattedNumber = Math.floor(current).toLocaleString();
            } else {
                formattedNumber = current.toFixed(1);
            }

            statNumber.textContent = formattedNumber;

            if (current >= target) {
                statNumber.textContent = target % 1 === 0 ? 
                    Math.floor(target).toLocaleString() : 
                    target.toFixed(1);
                statNumber.textContent += suffix;
                clearInterval(counter);

                statNumber.style.animation = 'pop 0.3s ease-out';
            }
        }, stepTime);
    });
}

document.head.insertAdjacentHTML('beforeend', `
    <style>
        @keyframes pop {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    </style>
`);

function initAnimations() {
    const animatedElements = document.querySelectorAll('.feature-card, .project-card, .endpoint-card');

    if (!window.IntersectionObserver || animatedElements.length === 0) {
        animatedElements.forEach(element => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
        return;
    }

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1 }
    );

    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(element);
    });
}