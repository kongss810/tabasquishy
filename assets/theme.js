const APILoader = {
    yt: { loading: false, callbacks: [] },
    vimeo: { loading: false, callbacks: [] },
    loadYouTube(cb) {
        if (window.YT && window.YT.Player) return cb();
        this.yt.callbacks.push(cb);
        if (!this.yt.loading) {
            this.yt.loading = true;
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            window.onYouTubeIframeAPIReady = () => {
                this.yt.callbacks.forEach((c) => c());
            };
            document.head.appendChild(script);
        }
    },
    loadVimeo(cb) {
        if (window.Vimeo && window.Vimeo.Player) return cb();
        this.vimeo.callbacks.push(cb);
        if (!this.vimeo.loading) {
            this.vimeo.loading = true;
            const script = document.createElement('script');
            script.src = 'https://player.vimeo.com/api/player.js';
            script.onload = () => {
                this.vimeo.callbacks.forEach((c) => c());
            };
            document.head.appendChild(script);
        }
    },
};

class VideoIntersectionInsert extends HTMLElement {
    constructor() {
        super();
        this._observer = null;
        this._isPlaying = false;
        this._loaded = false;
        this._ready = false;
        this._pendingPlay = false;

        this._provider = this.dataset.provider || 'html5';
        this._videoId = this.dataset.videoId;
        this._muted = this.dataset.muted === 'true';
        this._controls = this.dataset.controls === 'true';
        this._player = null;
        this._isModal = this.dataset.isModal === 'true';
        this._pausedOnLoad = this.dataset.pausedOnLoad === 'true';
    }

    connectedCallback() {
        if (!this._videoId && !this.dataset.src) return;

        this._observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                const isVisible = entry.isIntersecting;

                if (isVisible && !this._loaded) {
                    this.loadMedia();
                }

                if (this._pausedOnLoad) {
                    if (!isVisible && this._isPlaying) {
                        this.pauseMedia();
                    }
                } else {
                    if (isVisible && this._loaded && !this._isPlaying) {
                        if (this._muted || this._isModal) {
                            this.playMedia();
                        }
                    } else if (!isVisible && this._isPlaying) {
                        this.handleViewportExit();
                    }
                }
            },
            {
                root: null,
                rootMargin: '100px',
                threshold: Array.from({ length: 11 }, (_, i) => i / 10),
            },
        );

        this._observer.observe(this);
    }

    handleViewportExit() {
        this.pauseMedia();
        if (!this._muted) {
            this.muteMedia();
        }
    }

    loadMedia() {
        this.innerHTML = '';
        this._loaded = true;

        if (this._provider === 'youtube') {
            const container = document.createElement('div');
            container.className = 'w-full h-full';
            if (!this._controls && this._muted) container.style.pointerEvents = 'none';
            this.appendChild(container);
            APILoader.loadYouTube(() => this.initYouTube(container));
        } else if (this._provider === 'vimeo') {
            const container = document.createElement('div');
            container.className = 'w-full h-full';
            if (!this._controls && this._muted) container.style.pointerEvents = 'none';
            this.appendChild(container);
            APILoader.loadVimeo(() => this.initVimeo(container));
        } else {
            this.loadHTML5();
        }
    }

    loadHTML5() {
        if (this.dataset.src) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.dataset.src;
            this._player = tempDiv.querySelector('video');
            this.appendChild(this._player);
        } else {
            this._player = document.createElement('video');
            this._player.src = this._videoId;
            this._player.className = this.dataset.class || '';
            this._player.loop = true;
            this._player.playsInline = true;
            if (this._muted) this._player.muted = true;
            if (this._controls) {
                this._player.controls = true;
            }
            this.appendChild(this._player);
        }

        if (!this._controls) {
            this._player.removeAttribute('controls');
            if (this._muted) {
                this._player.style.pointerEvents = 'none';
            } else {
                this._player.style.cursor = 'pointer';
                this._player.addEventListener('click', () => {
                    if (this._isPlaying) {
                        this.pauseMedia();
                    } else {
                        this.playMedia();
                    }
                });
            }
        }

        if (this._muted) {
            if (this._player.readyState >= 1) {
                this.playMedia();
            } else {
                this._player.addEventListener(
                    'loadedmetadata',
                    () => {
                        this.playMedia();
                    },
                    { once: true },
                );
            }
        }

        this._player.addEventListener('play', () => {
            this._isPlaying = true;
        });
        this._player.addEventListener('pause', () => {
            this._isPlaying = false;
        });
    }

    initYouTube(container) {
        const autoplayFlag = this._muted && !this._pausedOnLoad ? 1 : 0;

        // 动态判断：有控制条就给完整原生体验，无控制条则极限精简
        const playerVars = {
            autoplay: autoplayFlag,
            controls: this._controls ? 1 : 0,
            mute: this._muted ? 1 : 0,
            loop: 1,
            playlist: this._videoId,
            playsinline: 1,
            rel: 0,
        };

        if (!this._controls) {
            playerVars.modestbranding = 1;
            playerVars.disablekb = 1;
            playerVars.iv_load_policy = 3;
        }

        this._player = new YT.Player(container, {
            videoId: this._videoId,
            width: '100%', // 强制满宽满高，修复 UI 控制栏被切除的 Bug
            height: '100%',
            playerVars: playerVars,
            events: {
                onReady: () => {
                    this._ready = true;
                    if (this._pendingPlay) {
                        this._pendingPlay = false;
                        this.playMedia();
                    } else if (!this._pausedOnLoad && (this._muted || this._isModal)) {
                        this.playMedia();
                    }
                },
                onStateChange: (e) => {
                    if (e.data === YT.PlayerState.PLAYING) {
                        this._isPlaying = true;
                    } else if (e.data === YT.PlayerState.PAUSED) {
                        this._isPlaying = false;
                    }
                },
            },
        });
    }

    initVimeo(container) {
        this._player = new Vimeo.Player(container, {
            id: this._videoId,
            width: '100%',
            height: '100%',
            autoplay: this._muted && !this._pausedOnLoad,
            controls: this._controls,
            muted: this._muted,
            loop: true,
            background: !this._controls && this._muted && !this._pausedOnLoad,
            // 动态判断：只有 controls: true 时才显示原生标题和头像信息
            title: this._controls,
            byline: this._controls,
            portrait: this._controls,
            dnt: true,
        });

        this._player.ready().then(() => {
            this._ready = true;
            if (this._pendingPlay) {
                this._pendingPlay = false;
                this.playMedia();
            } else if (!this._pausedOnLoad && (this._muted || this._isModal)) {
                this.playMedia();
            }
        });

        this._player.on('play', () => {
            this._isPlaying = true;
        });
        this._player.on('pause', () => {
            this._isPlaying = false;
        });
    }

    playMedia() {
        if ((this._provider === 'youtube' || this._provider === 'vimeo') && !this._ready) {
            if (!this._loaded) this.loadMedia();
            this._pendingPlay = true;
            return;
        }

        if (!this._muted) {
            if (GlobalAudioContext.activeElement && GlobalAudioContext.activeElement !== this) {
                GlobalAudioContext.activeElement.muteMedia();
            }
            GlobalAudioContext.activeElement = this;
        }

        if (this._provider === 'html5' && this._player) {
            const playPromise = this._player.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this._isPlaying = true;
                        if (!this._muted) this._player.muted = false;
                    })
                    .catch(() => {
                        this._isPlaying = false;
                    });
            }
        } else if (this._provider === 'youtube' && this._player?.playVideo) {
            this._player.playVideo();
            if (!this._muted) this._player.unMute();
            this._isPlaying = true;
        } else if (this._provider === 'vimeo' && this._player?.play) {
            this._player.play();
            if (!this._muted) this._player.setVolume(1);
            this._isPlaying = true;
        }
    }

    pauseMedia() {
        if (this._provider === 'html5' && this._player) {
            this._player.pause();
        } else if (this._provider === 'youtube' && this._player?.pauseVideo) {
            this._player.pauseVideo();
        } else if (this._provider === 'vimeo' && this._player?.pause) {
            this._player.pause();
        }
        this._isPlaying = false;
    }

    muteMedia() {
        if (this._provider === 'html5' && this._player) {
            this._player.muted = true;
        } else if (this._provider === 'youtube' && this._player?.mute) {
            this._player.mute();
        } else if (this._provider === 'vimeo' && this._player?.setVolume) {
            this._player.setVolume(0);
        }

        if (GlobalAudioContext.activeElement === this) {
            GlobalAudioContext.activeElement = null;
        }
    }

    resetMedia() {
        if (this._provider === 'html5' && this._player) {
            this._player.currentTime = 0;
        } else if (this._provider === 'youtube' && this._player?.seekTo) {
            this._player.seekTo(0, true);
        } else if (this._provider === 'vimeo' && this._player?.setCurrentTime) {
            this._player.setCurrentTime(0);
        }
    }

    disconnectedCallback() {
        this._observer?.disconnect();
    }
}

if (!customElements.get('video-intersection-insert')) {
    customElements.define('video-intersection-insert', VideoIntersectionInsert);
}

// 新加的highlighted-text
class HighlightedText extends HTMLElement {
    constructor() {
        super();
        // 如果浏览器不支持 IntersectionObserver, 则直接初始化
        if (!('IntersectionObserver' in window)) {
            this.init();
        }
    }

    connectedCallback() {
        // 使用 IntersectionObserver 来检测元素是否进入视口
        this._observer = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    this.init();
                    // 元素进入视口后就不需要继续观察了
                    observer.unobserve(this);
                }
            });
        });
        this._observer.observe(this);
    }

    init() {
        this.classList.add('animate');
    }

    disconnectedCallback() {
        // 清理 observer 防止内存泄漏
        if (this._observer) {
            this._observer.disconnect();
        }
    }
}
// 注意这里使用 extends 参数继承自 <em>
customElements.define('highlighted-text', HighlightedText, { extends: 'em' });

// 倒计时
class MyCountdown2 extends HTMLElement {
    connectedCallback() {
        const span = this.querySelector('span');
        const timeString = span?.getAttribute('data-time');
        this.endTime = timeString ? new Date(timeString).getTime() : null;
        this.endText = this.dataset.countdownEndText || '';

        if (!this.endTime || isNaN(this.endTime)) {
            this._endCountdown();
            return;
        }

        this._render();
        this._timer = setInterval(() => this._render(), 1000);
    }

    disconnectedCallback() {
        clearInterval(this._timer);
    }

    _endCountdown() {
        // this.innerHTML = this.endText
        //   ? `<span class="countdown__ended2">${this.endText}</span>`
        //   : "";

        // 或者连父容器一起隐藏（按实际结构调整层数）
        // this.parentElement.style.display = "none";
        this.style.display = 'none';
    }

    _render() {
        const diff = this.endTime - Date.now();

        if (diff <= 0) {
            clearInterval(this._timer);
            this._endCountdown();
            return;
        }

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const pad = (n) => String(n).padStart(2, '0');

        const unit = (num, label) => `
      <div class="countdown2__unit">
        <span class="countdown2__num">${pad(num)}</span>
        <span class="countdown2__label">${label}</span>
      </div>
    `;
        const sep = `<span class="countdown2__sep">:</span>`;

        this.innerHTML = `
      <div class="countdown2__wrapper">
        ${unit(days, 'DAYS')}${sep}
        ${unit(hours, 'HRS')}${sep}
        ${unit(minutes, 'MIN')}${sep}
        ${unit(seconds, 'SEC')}
      </div>
    `;
    }
}
customElements.define('my-countdown2', MyCountdown2);
