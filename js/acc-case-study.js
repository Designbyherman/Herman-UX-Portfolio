
function toggleAccordion(btn) {
  var open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!open));
  var panelId = btn.getAttribute('aria-controls');
  var panel = panelId ? document.getElementById(panelId) : btn.nextElementSibling;
  if (panel) panel.classList.toggle('open', !open);
}

window.addEventListener('DOMContentLoaded', function() {
  var topNav = document.querySelector('header');
  var floatNav = document.querySelector('.float-nav');
  var hero = document.querySelector('.hero') || document.querySelector('.b-hero');
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.float-nav .nav-item'));
  if (!floatNav || !hero || !navItems.length) return;

  var sectionLinks = navItems.map(function(item) {
    var href = item.getAttribute('href') || '';
    var section = href.charAt(0) === '#' ? document.querySelector(href) : null;
    return section ? { item: item, section: section, id: section.id } : null;
  }).filter(Boolean);

  if (!sectionLinks.length) return;

  var idleTimer = null;
  var collapseDelay = 1800;
  var lastScrollY = window.pageYOffset || 0;

  function setActive(id) {
    sectionLinks.forEach(function(link) {
      var isActive = link.id === id;
      link.item.classList.toggle('active', isActive);
      if (isActive) {
        link.item.setAttribute('aria-current', 'true');
      } else {
        link.item.removeAttribute('aria-current');
      }
    });
  }

  function expandFloatNav() {
    window.clearTimeout(idleTimer);
    floatNav.classList.remove('collapsed');
  }

  function scheduleCollapse() {
    window.clearTimeout(idleTimer);
    if (!floatNav.classList.contains('visible')) return;
    if (floatNav.matches(':hover') || floatNav.contains(document.activeElement)) return;
    idleTimer = window.setTimeout(function() {
      if (floatNav.classList.contains('visible') && !floatNav.matches(':hover') && !floatNav.contains(document.activeElement)) {
        floatNav.classList.add('collapsed');
      }
    }, collapseDelay);
  }

  function updateVisibility() {
    var isMobileViewport = window.matchMedia('(max-width: 640px)').matches;
    var revealY = isMobileViewport ? 100 : hero.offsetTop + (hero.offsetHeight * 0.63);
    var shouldShow = window.pageYOffset > revealY;
    floatNav.classList.toggle('visible', shouldShow);
    if (!shouldShow) {
      floatNav.classList.remove('collapsed');
      window.clearTimeout(idleTimer);
    }
  }

  function updateTopNav() {
    if (!topNav) return;

    var currentY = Math.max(window.pageYOffset || 0, 0);
    var scrollingDown = currentY > lastScrollY;
    var focusInsideTopNav = topNav.contains(document.activeElement);

    if (currentY <= 120 || !scrollingDown || focusInsideTopNav) {
      topNav.classList.remove('nav-hidden');
    } else {
      topNav.classList.add('nav-hidden');
    }

    lastScrollY = currentY;
  }

  function updateActiveSection() {
    var marker = window.innerHeight * 0.42;
    var current = sectionLinks[0];

    sectionLinks.forEach(function(link) {
      var rect = link.section.getBoundingClientRect();
      if (rect.top <= marker) {
        current = link;
      }
    });

    setActive(current.id);
  }

  function updateNav() {
    expandFloatNav();
    updateVisibility();
    updateActiveSection();
    updateTopNav();
    scheduleCollapse();
  }

  navItems.forEach(function(item) {
    item.addEventListener('click', function() {
      var targetId = (item.getAttribute('href') || '').replace('#', '');
      if (targetId) setActive(targetId);
      expandFloatNav();
      scheduleCollapse();
    });
  });

  floatNav.addEventListener('mouseenter', expandFloatNav);
  floatNav.addEventListener('pointerenter', expandFloatNav);
  floatNav.addEventListener('pointerdown', expandFloatNav);
  floatNav.addEventListener('touchstart', expandFloatNav, { passive: true });
  floatNav.addEventListener('focusin', expandFloatNav);
  floatNav.addEventListener('mouseleave', scheduleCollapse);
  floatNav.addEventListener('pointerleave', scheduleCollapse);
  floatNav.addEventListener('focusout', function() {
    window.setTimeout(scheduleCollapse, 0);
  });

  if (topNav) {
    topNav.addEventListener('focusin', function() {
      topNav.classList.remove('nav-hidden');
    });
  }

  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav);
});

(function() {
  var containers = document.querySelectorAll('.ss-outer-sticky');
  if (!containers.length) return;
  containers.forEach(function(container) {
    var steps = container.querySelectorAll('.ss-step');
    var visuals = container.querySelectorAll('.ss-vis');
    if (!steps.length || !visuals.length) return;
    function activate(v) {
      visuals.forEach(function(el) { el.classList.remove('active'); });
      var target = container.querySelector('.ss-vis[data-v="' + v + '"]');
      if (target) target.classList.add('active');
    }
    activate(steps[0].getAttribute('data-v'));
    var lastV = null;
    function tick() {
      var mid = window.innerHeight * 0.5;
      var best = steps[0]; var bestDist = Infinity;
      steps.forEach(function(s) {
        var r = s.getBoundingClientRect();
        if (r.bottom < -window.innerHeight || r.top > 2 * window.innerHeight) return;
        var center = r.top + r.height * 0.5;
        var dist = Math.abs(center - mid);
        if (dist < bestDist) { bestDist = dist; best = s; }
      });
      var v = best.getAttribute('data-v');
      if (v !== lastV) { activate(v); lastV = v; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
})();

window.addEventListener('DOMContentLoaded', function() {
  var containers = document.querySelectorAll('.ss-outer-sticky');
  if (!containers.length) return;
  containers.forEach(function(container) {
    var visSet = container.querySelector('.ss-vis-set');
    var ssLeft = container.querySelector('.ss-left');
    var steps  = container.querySelectorAll('.ss-step');
    function enableMobile() {
      steps.forEach(function(step) {
        var v = step.getAttribute('data-v');
        var vis = container.querySelector('.ss-vis[data-v="' + v + '"]');
        if (!vis || vis.parentNode === step) return;
        vis.style.position = 'relative'; vis.style.inset = 'auto';
        vis.style.opacity = '1'; vis.style.transform = 'none';
        vis.style.pointerEvents = 'auto'; vis.style.padding = '0 0 24px 0';
        step.insertBefore(vis, step.firstChild);
      });
      if (ssLeft) ssLeft.style.display = 'none';
    }
    function enableDesktop() {
      steps.forEach(function(step) {
        var v = step.getAttribute('data-v');
        var vis = step.querySelector(':scope > .ss-vis[data-v="' + v + '"]');
        if (!vis) return;
        vis.style.position = ''; vis.style.inset = '';
        vis.style.opacity = ''; vis.style.transform = '';
        vis.style.pointerEvents = ''; vis.style.padding = '';
        visSet.appendChild(vis);
      });
      if (ssLeft) ssLeft.style.display = '';
    }
    var mq = window.matchMedia('(max-width:900px)');
    function onBreakpoint(e) { if (e.matches) { enableMobile(); } else { enableDesktop(); } }
    onBreakpoint(mq);
    mq.addEventListener('change', onBreakpoint);
  });
});

window.addEventListener('DOMContentLoaded', function() {
  var visuals = document.querySelectorAll('.participation-visual');
  if (!visuals.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var entryDelay = 550;
  var tokenStagger = 22;
  var tokenTransition = 1000;
  var revealBuffer = 220;
  var tokenColumns = 10;

  function getTokenStats(grid) {
    return {
      total: parseInt(grid.getAttribute('data-token-count'), 10) || 100,
      startCount: parseInt(grid.getAttribute('data-start-count'), 10) || 94,
      visible: parseInt(grid.getAttribute('data-visible-count'), 10) || 34
    };
  }

  function getBottomAnchoredPosition(index, total) {
    var row = Math.floor(index / tokenColumns);
    var column = tokenColumns - 1 - (index % tokenColumns);
    var rows = Math.ceil(total / tokenColumns);
    return ((rows - row - 1) * tokenColumns) + column + 1;
  }

  function isInitiallyLost(index, stats) {
    return getBottomAnchoredPosition(index, stats.total) > stats.startCount;
  }

  function isFinallyLost(index, stats) {
    return getBottomAnchoredPosition(index, stats.total) > stats.visible;
  }

  function shouldAnimateLoss(index, stats) {
    return !isInitiallyLost(index, stats) && isFinallyLost(index, stats);
  }

  function buildTokens(visual) {
    var grid = visual.querySelector('.student-token-grid');
    if (!grid || grid.children.length) return;

    var stats = getTokenStats(grid);
    var animatedIndex = 0;

    for (var i = 0; i < stats.total; i += 1) {
      var token = document.createElement('span');
      token.className = 'student-token';
      token.setAttribute('aria-hidden', 'true');
      token.dataset.index = String(i);

      if (isInitiallyLost(i, stats)) {
        token.classList.add('is-lost');
      } else if (shouldAnimateLoss(i, stats)) {
        var delay = animatedIndex * tokenStagger;
        token.style.setProperty('--token-delay', delay + 'ms');
        animatedIndex += 1;
      }

      grid.appendChild(token);
    }
  }

  function setFinalState(visual) {
    var grid = visual.querySelector('.student-token-grid');
    if (!grid) return;
    var stats = getTokenStats(grid);

    visual.classList.add('is-complete');

    Array.prototype.forEach.call(grid.children, function(token, index) {
      token.classList.toggle('is-lost', isFinallyLost(index, stats));
    });
  }

  function animateVisual(visual) {
    if (visual.dataset.animated === 'true') return;
    visual.dataset.animated = 'true';

    var grid = visual.querySelector('.student-token-grid');
    var stats = grid ? getTokenStats(grid) : { total: 100, startCount: 94, visible: 34 };
    var animatedLossCount = Math.max(stats.startCount - stats.visible, 0);

    window.setTimeout(function() {
      if (grid) {
        Array.prototype.forEach.call(grid.children, function(token, index) {
          if (shouldAnimateLoss(index, stats)) token.classList.add('is-lost');
        });
      }

      var revealDelay = Math.max(animatedLossCount - 1, 0) * tokenStagger + tokenTransition + revealBuffer;

      window.setTimeout(function() {
        visual.classList.add('is-complete');
      }, revealDelay);
    }, entryDelay);
  }

  visuals.forEach(function(visual) {
    buildTokens(visual);

    if (reduceMotion) {
      visual.classList.add('is-reduced-motion');
      setFinalState(visual);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      animateVisual(visual);
      return;
    }

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        animateVisual(visual);
        observer.unobserve(visual);
      });
    }, {
      threshold: 0.68,
      rootMargin: '0px 0px -15% 0px'
    });

    observer.observe(visual);
  });
});

window.addEventListener('DOMContentLoaded', function() {
  var hamburger = document.querySelector('.hamburger');
  var mobileMenu = document.querySelector('.mobile-menu');
  if (!hamburger || !mobileMenu) return;

  var mobileLinks = mobileMenu.querySelectorAll('a');

  hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });

  mobileLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });

  document.addEventListener('click', function(event) {
    var isClickInside = hamburger.contains(event.target) || mobileMenu.contains(event.target);
    if (!isClickInside && mobileMenu.classList.contains('active')) {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
    }
  });
});
