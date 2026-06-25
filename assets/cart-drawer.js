/**
 * Cart drawer – You May Also Like Swiper
 */
window.CartDrawerRecommendations = {
    instances: new WeakMap(),

    init(root) {
        const drawer = root || document.getElementById('Cart-Drawer');
        if (!drawer || typeof Swiper === 'undefined') return;

        drawer.querySelectorAll('.cart-drawer-recommendations-swiper').forEach((el) => {
            if (this.instances.has(el)) {
                this.instances.get(el).destroy(true, true);
                this.instances.delete(el);
            }

            const section = el.closest('.cart-drawer__recommendations');
            const prevEl = section ? section.querySelector('.cart-drawer__recommendations-btn--prev') : null;
            const nextEl = section ? section.querySelector('.cart-drawer__recommendations-btn--next') : null;

            const swiper = new Swiper(el, {
                slidesPerView: 1.42,
                spaceBetween: 24, 
                watchOverflow: true,
                observer: true,
                observeParents: true,
                navigation: {
                    prevEl: prevEl,
                    nextEl: nextEl,
                },
            });

            this.instances.set(el, swiper);
        });
    },
};

(function () {
    const drawer = document.getElementById('Cart-Drawer');
    if (!drawer) return;

    document.addEventListener('DOMContentLoaded', () => window.CartDrawerRecommendations.init());
    document.addEventListener('line-item:change:end', () => {
        setTimeout(() => window.CartDrawerRecommendations.init(), 50);
    });
    document.addEventListener('cart-drawer:open', () => {
        setTimeout(() => window.CartDrawerRecommendations.init(), 50);
    });
})();
