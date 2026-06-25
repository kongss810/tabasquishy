/**
 *  @class
 *  @function FreeShipping
 */

if (!customElements.get('free-shipping')) {
  class FreeShipping extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      const isCartDrawer = this.classList.contains('cart-drawer-shipping');
      const amountText = this.querySelector('.free-shipping--text span') || this.querySelector('.cart-drawer-shipping__amount');
      const total = parseInt(this.dataset.cartTotal, 10);
      const minimum = Math.round(parseInt(this.dataset.minimum, 10) * (Shopify.currency.rate || 1));
      let percentage = 1;

      this.remainingText = this.querySelector('.free-shipping--text-remaining') || this.querySelector('.cart-drawer-shipping__message--remaining');
      this.fullText = this.querySelector('.free-shipping--text-full') || this.querySelector('.cart-drawer-shipping__message--full');
      this.fillEl = this.querySelector('.free-shipping--percentage') || this.querySelector('.cart-drawer-shipping__fill');

      if (total < minimum) {
        percentage = total / minimum;

        if (amountText) {
          const remaining = minimum - total;
          const format = window.theme.settings.money_with_currency_format || '${{amount}}';
          amountText.innerHTML = formatMoney(remaining, format);
        }

        if (this.remainingText) {
          this.remainingText.style.display = 'block';
        }
        if (this.fullText) {
          this.fullText.style.display = 'none';
        }
      } else {
        if (this.remainingText) {
          this.remainingText.style.display = 'none';
        }
        if (this.fullText) {
          this.fullText.style.display = 'block';
        }
      }

      if (isCartDrawer && this.fillEl) {
        this.fillEl.style.width = `${Math.min(Math.max(percentage, 0), 1) * 100}%`;
      } else {
        this.style.setProperty('--percentage', percentage);
      }
    }
  }
  customElements.define('free-shipping', FreeShipping);
}
