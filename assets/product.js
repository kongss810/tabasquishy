if (!customElements.get('variant-selects')) {

  /**
   *  @class
   *  @function VariantSelects
   */
  class VariantSelects extends HTMLElement {
    constructor() {
      super();
      this.sticky = this.dataset.sticky;
      this.updateUrl = this.dataset.updateUrl === 'true';
      this.isDisabledFeature = this.dataset.isDisabled;
      this.addEventListener('change', this.onVariantChange);
      this.other = Array.from(document.querySelectorAll('variant-selects')).filter((selector) => {
        return selector != this;
      });

      this.productWrapper = this.closest('.thb-product-detail');
      this.productSlider = this.productWrapper.querySelector('.product-images');
      this.hideVariants = this.dataset.hideVariants === 'true';
    }

    connectedCallback() {
      this.updateOptions();
      this.updateMasterId();
      this.updateVariantOptionImages();
      this.setDisabled();
      this.setImageSet();
    }

    onVariantChange() {
      this.updateOptions();
      this.updateMasterId();
      this.toggleAddButton(true, '', false);
      this.updatePickupAvailability();
      this.removeErrorMessage();
      this.updateVariantText();
      this.updateVariantOptionImages();
      this.setDisabled();

      if (!this.currentVariant) {
        this.toggleAddButton(true, '', true);
        this.setUnavailable();
      } else {
        this.updateMedia();
        if (this.updateUrl) {
          this.updateURL();
        }
        this.updateVariantInput();
        this.renderProductInfo();
        //this.updateShareUrl();
      }

      this.updateOther();
      dispatchCustomEvent('product:variant-change', {
        variant: this.currentVariant,
        sectionId: this.dataset.section
      });
    }

    updateOptions() {
      this.fieldsets = Array.from(this.querySelectorAll('fieldset'));
      this.options = [];
      this.fieldsets.forEach((fieldset, i) => {
        if (fieldset.querySelector('select')) {
          this.options.push(fieldset.querySelector('select').value);
        } else if (fieldset.querySelectorAll('input').length) {
          this.options.push(fieldset.querySelector('input:checked').value);
        }
      });
    }
    updateVariantText() {
      const fieldsets = Array.from(this.querySelectorAll('fieldset'));
      fieldsets.forEach((item, i) => {
        let label = item.querySelector('.form__label__value');
        if (label) {
          label.innerHTML = this.options[i];
        }
      });
    }
    updateMasterId() {
      this.currentVariant = this.getVariantData().find((variant) => {
        return !variant.options.map((option, index) => {
          return this.options[index] === option;
        }).includes(false);
      });
    }

    updateOther() {
      if (this.dataset.updateUrl === 'false') {
        return;
      }
      if (this.other.length) {
        let fieldsets = this.other[0].querySelectorAll('fieldset'),
          fieldsets_array = Array.from(fieldsets);
        this.options.forEach((option, i) => {
          if (fieldsets_array[i].querySelector('select')) {
            fieldsets_array[i].querySelector(`select`).value = option;
          } else if (fieldsets_array[i].querySelectorAll('input').length) {
            fieldsets_array[i].querySelector(`input[value='${option}']`).checked = true;
          }
        });
        this.other[0].updateOptions();
        this.other[0].updateMasterId();
        this.other[0].updateVariantText();
        this.other[0].updateVariantOptionImages();
        this.other[0].setDisabled();
      }
    }

    updateVariantOptionImages() {
      const imageContainers = Array.from(this.querySelectorAll('[data-variant-option-image]'));
      if (!imageContainers.length) {
        return;
      }

      const variants = this.getVariantData();
      imageContainers.forEach((container) => {
        const optionIndex = Number(container.dataset.optionIndex);
        const optionValue = container.dataset.optionValue;
        if (Number.isNaN(optionIndex) || !optionValue) {
          return;
        }

        const matchedVariant = variants.find((variant) => {
          if (variant.options[optionIndex] !== optionValue) {
            return false;
          }

          return this.options.every((selectedValue, selectedIndex) => {
            return selectedIndex === optionIndex || variant.options[selectedIndex] === selectedValue;
          });
        }) || variants.find((variant) => variant.options[optionIndex] === optionValue);

        const image = matchedVariant ? (matchedVariant.featured_image || matchedVariant.featured_media?.preview_image || matchedVariant.image) : null;
        const imageSrc = typeof image === 'string' ? image : image?.src;
        const fallbackSrc = container.dataset.fallbackSrc;
        const nextSrc = imageSrc || fallbackSrc;
        const img = container.querySelector('img');

        if (img && nextSrc && img.getAttribute('src') !== nextSrc) {
          img.setAttribute('src', nextSrc);
          img.removeAttribute('srcset');
        }
      });
    }

    updateMedia() {
      if (!this.currentVariant) return;
      if (!this.currentVariant.featured_media) return;

      let productSlider = document.querySelector('.thb-product-detail .product-images'),
        thumbnails = document.querySelector('.thb-product-detail #Product-Thumbnails');

      this.setActiveMedia(`#Slide-${this.dataset.section}-${this.currentVariant.featured_media.id}`, `#Thumb-${this.dataset.section}-${this.currentVariant.featured_media.id}`, productSlider, thumbnails);
    }
    setActiveMedia(mediaId, thumbId, productSlider, thumbnails) {
      let flkty = Flickity.data(productSlider),
        activeMedia = productSlider.querySelector(mediaId);

      if (flkty && this.hideVariants) {


        if (productSlider.querySelector('.product-images__slide.is-initial-selected')) {
          productSlider.querySelector('.product-images__slide.is-initial-selected').classList.remove('is-initial-selected');
        }
        [].forEach.call(productSlider.querySelectorAll('.product-images__slide-item--variant'), function (el) {
          el.classList.remove('is-active');
        });

        activeMedia.classList.add('is-active');
        activeMedia.classList.add('is-initial-selected');

        this.setImageSetMedia();

        if (thumbnails) {
          let activeThumb = thumbnails.querySelector(thumbId);

          if (thumbnails.querySelector('.product-thumbnail.is-initial-selected')) {
            thumbnails.querySelector('.product-thumbnail.is-initial-selected').classList.remove('is-initial-selected');
          }
          [].forEach.call(thumbnails.querySelectorAll('.product-images__slide-item--variant'), function (el) {
            el.classList.remove('is-active');
          });

          activeThumb.classList.add('is-active');
          activeThumb.classList.add('is-initial-selected');
        }

        productSlider.reInit(this.imageSetIndex);
        productSlider.selectCell(mediaId);

      } else if (flkty) {
        productSlider.selectCell(mediaId);
      }

    }

    updateURL() {
      if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
      window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
    }

    updateShareUrl() {
      const shareButton = document.getElementById(`Share-${this.dataset.section}`);
      if (!shareButton) return;
      shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
    }

    updateVariantInput() {
      const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment`);
      productForms.forEach((productForm) => {
        const input = productForm.querySelector('input[name="id"]');
        input.value = this.currentVariant.id;
        input.dispatchEvent(new Event('change', {
          bubbles: true
        }));
      });
    }

    updatePickupAvailability() {
      const pickUpAvailability = document.querySelector('.pickup-availability-wrapper');

      if (!pickUpAvailability) return;

      if (this.currentVariant && this.currentVariant.available) {
        pickUpAvailability.fetchAvailability(this.currentVariant.id);
      } else {
        pickUpAvailability.removeAttribute('available');
        pickUpAvailability.innerHTML = '';
      }
    }

    removeErrorMessage() {
      const section = this.closest('section');
      if (!section) return;

      const productForm = section.querySelector('product-form');
      if (productForm) productForm.handleErrorMessage();
    }

    getSectionsToRender() {
      return [`price-${this.dataset.section}`, `price-${this.dataset.section}--sticky`, `product-image-${this.dataset.section}--sticky`, `inventory-${this.dataset.section}`, `sku-${this.dataset.section}`, `quantity-${this.dataset.section}`];
    }

    renderProductInfo() {
      let sections = this.getSectionsToRender();

      fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');

          sections.forEach((id) => {
            const destination = document.getElementById(id);
            const source = html.getElementById(id);

            if (source && destination) destination.innerHTML = source.innerHTML;

            const price = document.getElementById(id);
            const price_fixed = document.getElementById(id + '--sticky');

            if (price) price.classList.remove('visibility-hidden');
            if (price_fixed) price_fixed.classList.remove('visibility-hidden');

          });
          this.toggleAddButton(!this.currentVariant.available, window.theme.variantStrings.soldOut);

        });
    }

    toggleAddButton(disable = true, text = false, modifyClass = true) {
      const productForm = document.getElementById(`product-form-${this.dataset.section}`);
      if (!productForm) return;

      const submitButtons = document.querySelectorAll('.single-add-to-cart-button');

      if (!submitButtons) return;

      submitButtons.forEach((submitButton) => {
        const submitButtonText = submitButton.querySelector('.single-add-to-cart-button--text');

        if (!submitButtonText) return;

        if (disable) {
          submitButton.setAttribute('disabled', 'disabled');
          if (text) submitButtonText.textContent = text;
        } else {
          submitButton.removeAttribute('disabled');
          submitButton.classList.remove('loading');
          submitButtonText.textContent = window.theme.variantStrings.addToCart;
        }
      });

      if (!modifyClass) return;
    }

    setUnavailable() {
      const submitButtons = document.querySelectorAll('.single-add-to-cart-button');
      const price = document.getElementById(`price-${this.dataset.section}`);
      const price_fixed = document.getElementById(`price-${this.dataset.section}--sticky`);

      submitButtons.forEach((submitButton) => {
        const submitButtonText = submitButton.querySelector('.single-add-to-cart-button--text');
        if (!submitButton) return;
        submitButtonText.textContent = window.theme.variantStrings.unavailable;
        submitButton.classList.add('sold-out');
      });
      if (price) price.classList.add('visibility-hidden');
      if (price_fixed) price_fixed.classList.add('visibility-hidden');
    }

    setDisabled() {
      if (this.isDisabledFeature != 'true') {
        return;
      }
      const variant_data = this.getVariantData();


      if (variant_data) {

        const selected_options = this.currentVariant.options.map((value, index) => {
          return {
            value,
            index: `option${index + 1}`
          };
        });
        const available_options = this.createAvailableOptionsTree(variant_data, selected_options);


        this.fieldsets.forEach((fieldset, i) => {
          const fieldset_options = Object.values(available_options)[i];

          if (fieldset_options) {
            if (fieldset.querySelector('select')) {
              fieldset_options.forEach((option, option_i) => {
                if (option.isUnavailable) {
                  fieldset.querySelector('option[value=' + JSON.stringify(option.value) + ']').disabled = true;
                } else {
                  fieldset.querySelector('option[value=' + JSON.stringify(option.value) + ']').disabled = false;
                }
              });
            } else if (fieldset.querySelectorAll('input').length) {
              fieldset.querySelectorAll('input').forEach((input, input_i) => {
                input.classList.toggle('is-disabled', fieldset_options[input_i].isUnavailable);
              });
            }
          }
        });

      }
      return true;
    }

    getImageSetName(variant_name) {
      return variant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '').replace(/^-/, '');
    }

    setImageSet() {
      if (!this.productSlider) return;

      let dataSetEl = this.productSlider.querySelector('[data-set-name]');
      if (dataSetEl) {
        this.imageSetName = dataSetEl.dataset.setName;
        this.imageSetIndex = this.querySelector('.product-form__input[data-handle="' + this.imageSetName + '"]').dataset.index;
        this.dataset.imageSetIndex = this.imageSetIndex;
        this.setImageSetMedia();
      }
    }
    setImageSetMedia() {
      if (!this.imageSetIndex) {
        return;
      }

      let setValue = this.getImageSetName(this.currentVariant[this.imageSetIndex]);
      let group = this.imageSetName + '_' + setValue;
      let selected_set_images = this.productWrapper.querySelectorAll(`.product-images__slide[data-set-name="${this.imageSetName}"]`),
        selected_set_thumbs = this.productWrapper.querySelectorAll(`.product-thumbnail[data-set-name="${this.imageSetName}"]`);

      if (this.hideVariants) {
        // Product images
        this.productWrapper.querySelectorAll('.product-images__slide').forEach(thumb => {
          if (thumb.dataset.group && thumb.dataset.group !== group) {
            thumb.classList.remove('is-active');
          }
        });
        selected_set_images.forEach(thumb => {
          thumb.classList.toggle('is-active', thumb.dataset.group === group);
        });

        // Product thumbnails
        this.productWrapper.querySelectorAll('.product-thumbnail').forEach(thumb => {
          if (thumb.dataset.group && thumb.dataset.group !== group) {
            thumb.classList.remove('is-active');
          }
        });
        selected_set_thumbs.forEach(thumb => {
          thumb.classList.toggle('is-active', thumb.dataset.group === group);
        });
      }

    }

    createAvailableOptionsTree(variant_data, selected_options) {
      // Reduce variant array into option availability tree
      return variant_data.reduce((options, variant) => {

        // Check each option group (e.g. option1, option2, option3) of the variant
        Object.keys(options).forEach(index => {

          if (variant[index] === null) return;

          let entry = options[index].find(option => option.value === variant[index]);

          if (typeof entry === 'undefined') {
            // If option has yet to be added to the options tree, add it
            entry = {
              value: variant[index],
              isUnavailable: true
            };
            options[index].push(entry);
          }

          // Check how many selected option values match a variant
          const countVariantOptionsThatMatchCurrent = selected_options.reduce((count, {
            value,
            index
          }) => {
            return variant[index] === value ? count + 1 : count;
          }, 0);

          // Only enable an option if an available variant matches all but one current selected value
          if (countVariantOptionsThatMatchCurrent >= selected_options.length - 1) {
            entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
          }

          // Make sure if a variant is unavailable, disable currently selected option
          if ((!this.currentVariant || !this.currentVariant.available) && selected_options.find((option) => option.value === entry.value && index === option.index)) {
            entry.isUnavailable = true;
          }

          // First option is always enabled
          if (index === 'option1') {
            entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
          }
        });

        return options;
      }, {
        option1: [],
        option2: [],
        option3: []
      });
    }

    getVariantData() {
      this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
      return this.variantData;
    }
  }
  customElements.define('variant-selects', VariantSelects);

  /**
   *  @class
   *  @function VariantRadios
   */
  class VariantRadios extends VariantSelects {
    constructor() {
      super();
    }

    updateOptions() {
      const fieldsets = Array.from(this.querySelectorAll('fieldset'));
      this.options = fieldsets.map((fieldset) => {
        return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
      });
    }
  }

  customElements.define('variant-radios', VariantRadios);
}

if (!customElements.get('product-slider')) {
  /**
   *  @class
   *  @function ProductSlider
   */
  class ProductSlider extends HTMLElement {
    constructor() {
      super();

      this.addEventListener('change', this.setupProductGallery);
    }
    connectedCallback() {
      this.product_container = this.closest('.thb-product-detail');
      this.thumbnail_container = this.product_container.querySelector('.product-thumbnail-container');
      this.video_containers = this.querySelectorAll('.product-single__media-external-video--play');
      this.media_toggle = this.product_container.querySelector('.product-media-toggle');
      this.media_mode = this.media_toggle ? 'video' : 'all';
      this.applyMediaFilter();

      this.setOptions();
      // Start Slider
      this.init();
    }
    setOptions() {
      this.hide_variants = this.dataset.hideVariants == 'true';
      this.thumbnails = this.thumbnail_container.querySelectorAll('.product-thumbnail');
      this.prev_button = this.querySelector('.flickity-prev');
      this.next_button = this.querySelector('.flickity-next');
      this.options = {
        wrapAround: true,
        pageDots: true,
        contain: true,
        adaptiveHeight: true,
        initialIndex: '.is-initial-selected',
        prevNextButtons: false,
        fade: false,
        cellSelector: this.media_toggle ? '.product-images__slide.is-active.is-media-visible' : '.product-images__slide.is-active'
      };
    }
    init() {
      this.flkty = new Flickity(this, this.options);

      this.selectedIndex = this.flkty.selectedIndex;

      // Setup Events
      this.setupEvents();

      // Start Gallery
      this.setupProductGallery();
      this.setupMediaToggle();
      this.updateMediaToggleState();
    }
    reInit(imageSetIndex) {

      this.flkty.destroy();

      this.applyMediaFilter();
      this.setOptions();

      this.flkty = new Flickity(this, this.options);

      // Setup Events
      this.setupEvents();

      this.selectedIndex = this.flkty.selectedIndex;
      this.updateMediaToggleState();
    }
    setupEvents() {
      const _this = this;
      if (this.prev_button) {
        let prev = this.prev_button.cloneNode(true);
        this.prev_button.parentNode.append(prev);
        this.prev_button.remove();
        this.prev_button = prev;
        prev.addEventListener('click', (event) => {
          this.flkty.previous();
        });
        prev.addEventListener('keyup', (event) => {
          this.flkty.previous();
          event.preventDefault();
        });
      }
      if (this.next_button) {
        let next = this.next_button.cloneNode(true);
        this.next_button.parentNode.append(next);
        this.next_button.remove();
        this.next_button = next;
        next.addEventListener('click', (event) => {
          this.flkty.next();
        });
        next.addEventListener('keyup', (event) => {
          this.flkty.next();
          event.preventDefault();
        });
      }
      this.video_containers.forEach((container) => {
        container.querySelector('button').addEventListener('click', function () {
          container.setAttribute('hidden', '');
        });
      });
      this.flkty.on('settle', function (index) {
        _this.selectedIndex = index;
      });
      this.flkty.on('change', (index) => {

        let previous_slide = this.flkty.cells[_this.selectedIndex] ? this.flkty.cells[_this.selectedIndex].element : null,
          previous_media = previous_slide ? previous_slide.querySelector('.product-single__media') : null,
          active_thumbs = Array.from(this.thumbnails).filter(element => element.classList.contains('is-active') && !element.classList.contains('is-media-hidden')),
          active_thumb = active_thumbs[index] ? active_thumbs[index] : active_thumbs[0];

        this.thumbnails.forEach((item, i) => {
          item.classList.remove('is-initial-selected');
        });
        if (active_thumb) {
          active_thumb.classList.add('is-initial-selected');
        }

        requestAnimationFrame(() => {
          if (!active_thumb || active_thumb.offsetParent === null) {
            return;
          }
          const windowHalfHeight = active_thumb.offsetParent.clientHeight / 2,
            windowHalfWidth = active_thumb.offsetParent.clientWidth / 2;
          active_thumb.parentElement.scrollTo({
            left: active_thumb.offsetLeft - windowHalfWidth + active_thumb.clientWidth / 2,
            top: active_thumb.offsetTop - windowHalfHeight + active_thumb.clientHeight / 2,
            behavior: 'smooth'
          });
        });

        if (previous_media) {
          this.pauseMedia(previous_media);
        }

        this.updateMediaToggleState();

      });


      setTimeout(() => {
        this.thumbnails.forEach((thumbnail) => {
          if (thumbnail.dataset.galleryListener === 'true') {
            return;
          }
          thumbnail.dataset.galleryListener = 'true';
          thumbnail.addEventListener('click', () => {
            this.thumbnailClick(thumbnail);
          });
        });
      });

      this.updateNavVisibility();

    }
    thumbnailClick(thumbnail) {
      [].forEach.call(this.thumbnails, function (el) {
        el.classList.remove('is-initial-selected');
      });
      thumbnail.classList.add('is-initial-selected');
      const active_thumbs = Array.from(this.thumbnails).filter(element => element.classList.contains('is-active') && !element.classList.contains('is-media-hidden'));
      const index = active_thumbs.indexOf(thumbnail);
      if (index < 0) {
        return;
      }
      this.flkty.select(index);
    }
    setupMediaToggle() {
      if (!this.media_toggle || this.media_toggle.dataset.initialized === 'true') {
        return;
      }

      this.media_toggle.dataset.initialized = 'true';
      this.media_toggle.querySelectorAll('[data-media-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
          this.setMediaMode(button.dataset.mediaToggle);
        });
      });
    }
    setMediaMode(mode) {
      if (!this.media_toggle || this.media_mode === mode) {
        return;
      }

      const previous_media = this.flkty && this.flkty.selectedElement ? this.flkty.selectedElement.querySelector('.product-single__media') : null;
      this.media_mode = mode;
      this.applyMediaFilter();

      if (this.flkty) {
        this.flkty.destroy();
        this.setOptions();
        this.flkty = new Flickity(this, this.options);
        this.setupEvents();
        this.selectedIndex = this.flkty.selectedIndex;
      }

      if (previous_media) {
        this.pauseMedia(previous_media);
      }
      this.updateMediaToggleState();
      this.updateNavVisibility();
    }
    applyMediaFilter() {
      const slides = Array.from(this.querySelectorAll('.product-images__slide'));
      const thumbnails = Array.from(this.thumbnails || this.thumbnail_container.querySelectorAll('.product-thumbnail'));

      slides.forEach((slide) => {
        slide.classList.toggle('is-media-visible', this.isVisibleInMediaMode(slide.dataset.mediaType));
        slide.classList.remove('is-initial-selected');
      });
      thumbnails.forEach((thumbnail) => {
        const isVisible = this.isVisibleInMediaMode(thumbnail.dataset.mediaType);
        thumbnail.classList.toggle('is-media-hidden', !isVisible);
        thumbnail.classList.remove('is-initial-selected');
      });

      const firstVisibleSlide = slides.find((slide) => slide.classList.contains('is-active') && slide.classList.contains('is-media-visible'));
      const firstVisibleThumb = thumbnails.find((thumbnail) => thumbnail.classList.contains('is-active') && !thumbnail.classList.contains('is-media-hidden'));
      if (firstVisibleSlide) {
        firstVisibleSlide.classList.add('is-initial-selected');
      }
      if (firstVisibleThumb) {
        firstVisibleThumb.classList.add('is-initial-selected');
      }
    }
    isVisibleInMediaMode(mediaType) {
      if (!this.media_toggle || this.media_mode === 'all') {
        return true;
      }
      if (this.media_mode === 'video') {
        return mediaType === 'video' || mediaType === 'external_video';
      }
      return mediaType === 'image';
    }
    pauseMedia(media) {
      if (media.classList.contains('product-single__media-external-video')) {
        if (media.dataset.provider === 'youtube') {
          media.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
            event: "command",
            func: "pauseVideo",
            args: ""
          }), "*");
        } else if (media.dataset.provider === 'vimeo') {
          media.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
            method: "pause"
          }), "*");
        }
        media.querySelector('.product-single__media-external-video--play').removeAttribute('hidden');
      } else if (media.classList.contains('product-single__media-native-video')) {
        media.querySelector('video').pause();
      }
    }
    updateMediaToggleState() {
      if (!this.media_toggle) {
        return;
      }

      this.media_toggle.querySelectorAll('[data-media-toggle]').forEach((button) => {
        const isActive = button.dataset.mediaToggle === this.media_mode;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }
    updateNavVisibility() {
      if (!this.flkty) {
        return;
      }

      const shouldHide = this.flkty.cells.length <= 1;
      this.querySelectorAll('.flickity-nav').forEach((button) => {
        button.classList.toggle('is-hidden', shouldHide);
        button.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
        button.tabIndex = shouldHide ? -1 : 0;
      });
    }
    setDraggable(draggable) {
      this.flkty.options.draggable = draggable;
      this.flkty.updateDraggable();
    }
    selectCell(mediaId) {
      this.flkty.selectCell(mediaId);
    }
    setupProductGallery() {
      if (!this.querySelectorAll('.product-single__media-zoom').length) {
        return;
      }
      this.setEventListeners();
    }
    buildItems() {
      this.activeImages = Array.from(this.querySelectorAll('.product-images__slide.is-active .product-single__media-image'));

      return this.activeImages.map((item) => {
        let index = [].indexOf.call(item.parentNode.parentNode.children, item.parentNode);

        let activelink = item.querySelector('.product-single__media-zoom');

        activelink.dataset.index = index;
        return {
          src: activelink.getAttribute('href'),
          msrc: activelink.dataset.msrc,
          w: activelink.dataset.w,
          h: activelink.dataset.h
        };
      });
    }
    setEventListeners() {
      this.links = this.querySelectorAll('.product-single__media-zoom');
      this.pswpElement = document.querySelectorAll('.pswp')[0];
      this.pswpOptions = {
        maxSpreadZoom: 2,
        loop: false,
        allowPanToNext: false,
        closeOnScroll: false,
        showHideOpacity: false,
        arrowKeys: true,
        history: false,
        captionEl: false,
        fullscreenEl: false,
        zoomEl: false,
        shareEl: false,
        counterEl: true,
        arrowEl: true,
        preloaderEl: true,
        getThumbBoundsFn: () => {
          const thumbnail = this.querySelector('.product-images__slide.is-selected'),
            pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
            rect = thumbnail.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top + pageYScroll,
            w: rect.width
          };
        }
      };


      this.links.forEach((link => {
        link.addEventListener('click', (e) => this.zoomClick(e, link));
      }));
    }
    zoomClick(e, link) {
      this.items = this.buildItems();
      this.pswpOptions.index = parseInt(link.dataset.index, 10);
      if (typeof PhotoSwipe !== 'undefined') {
        let pswp = new PhotoSwipe(this.pswpElement, PhotoSwipeUI_Default, this.items, this.pswpOptions);
        pswp.listen('firstUpdate', function () {
          pswp.listen('parseVerticalMargin', function (item) {
            item.vGap = {
              top: 50,
              bottom: 50
            };
          });
        });
        pswp.init();
      }
      e.preventDefault();
    }
  }
  customElements.define('product-slider', ProductSlider);
}

/**
 *  @class
 *  @function ProductForm
 */
if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.sticky = this.dataset.sticky;
      this.form = document.getElementById(`product-form-${this.dataset.section}`);
      if (this.form.dataset.listenerAttached) return;

  this.form.dataset.listenerAttached = 'true';

      this.form.querySelector('[name=id]').disabled = false;
      if (!this.sticky) {
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      }
      this.cartNotification = document.querySelector('cart-notification');
      this.body = document.body;

      this.hideErrors = this.dataset.hideErrors === 'true';
    }

    onSubmitHandler(evt) {
      evt.preventDefault();

      if (!this.form.reportValidity()) {
        return;
      }

      const submitButtons = document.querySelectorAll('.single-add-to-cart-button');

      submitButtons.forEach((submitButton) => {
        if (submitButton.classList.contains('loading')) return;
        submitButton.setAttribute('aria-disabled', true);
        submitButton.classList.add('loading');
      });

      this.handleErrorMessage();


      const config = {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/javascript'
        }
      };


      let formData = new FormData(this.form);

      formData.append('sections', this.getSectionsToRender().map((section) => section.section));
      formData.append('sections_url', window.location.pathname);
      config.body = formData;
      fetch(`${theme.routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            dispatchCustomEvent('product:variant-error', {
              source: 'product-form',
              productVariantId: formData.get('id'),
              errors: response.description,
              message: response.message
            });
            this.handleErrorMessage(response.description);
            return;
          }

          this.renderContents(response);

          dispatchCustomEvent('cart:item-added', {
            product: response.hasOwnProperty('items') ? response.items[0] : response
          });
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          submitButtons.forEach((submitButton) => {
            submitButton.classList.remove('loading');
            submitButton.removeAttribute('aria-disabled');
          });
        });
    }

    getSectionsToRender() {
      return [{
        id: 'Cart',
        section: 'main-cart',
        selector: '.thb-cart-form'
      },
      {
        id: 'Cart-Drawer',
        section: 'cart-drawer',
        selector: '.cart-drawer'
      },
      {
        id: 'cart-drawer-toggle',
        section: 'cart-bubble',
        selector: '.thb-item-count'
      }];
    }
    renderContents(parsedState) {
      this.getSectionsToRender().forEach((section => {
        if (!document.getElementById(section.id)) {
          return;
        }
        const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
        elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);

        if (typeof CartDrawer !== 'undefined') {
          new CartDrawer();
        }
        if (typeof Cart !== 'undefined') {
          new Cart().renderContents(parsedState);
        }
      }));



      let product_drawer = document.getElementById('Product-Drawer'),
        search_drawer = document.getElementById('Search-Drawer');

      if (search_drawer.classList.contains('active')) {
        search_drawer.classList.remove('active');
      }
      if (product_drawer && product_drawer.contains(this)) {
        product_drawer.classList.remove('active');
        this.body.classList.remove('open-cc--product');
        if (document.getElementById('Cart-Drawer')) {
          this.body.classList.add('open-cc');
          document.getElementById('Cart-Drawer').classList.add('active');
        }
      } else if (document.getElementById('Cart-Drawer')) {
        this.body.classList.add('open-cc');
        document.getElementById('Cart-Drawer').classList.add('active');
        dispatchCustomEvent('cart-drawer:open');
      }
    }
    getSectionInnerHTML(html, selector = '.shopify-section') {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
    }
    handleErrorMessage(errorMessage = false) {
      if (this.hideErrors) return;
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  });
}


/**
 *  @class
 *  @function ProductAddToCartSticky
 */
if (!customElements.get('product-add-to-cart-sticky')) {
  class ProductAddToCartSticky extends HTMLElement {
    constructor() {
      super();

      this.animations_enabled = document.body.classList.contains('animations-true') && typeof gsap !== 'undefined';
    }
    connectedCallback() {
      this.setupObservers();
      this.setupToggle();
    }
    setupToggle() {
      const button = this.querySelector('.product-add-to-cart-sticky--inner'),
        content = this.querySelector('.product-add-to-cart-sticky--content');

      if (this.animations_enabled) {
        const tl = gsap.timeline({
          reversed: true,
          paused: true,
          onStart: () => {
            button.classList.add('sticky-open');
          },
          onReverseComplete: () => {
            button.classList.remove('sticky-open');
          }
        });

        tl
          .set(content, {
            display: 'block',
            height: 'auto'
          }, 'start')
          .from(content, {
            height: 0,
            duration: 0.25
          }, 'start+=0.001');

        button.addEventListener('click', function () {
          tl.reversed() ? tl.play() : tl.reverse();

          return false;
        });
      } else {
        button.addEventListener('click', function () {
          content.classList.toggle('active');
          return false;
        });
      }

    }
    setupObservers() {
      let _this = this,
        observer = new IntersectionObserver(function (entries) {
          entries.forEach((entry) => {
            if (entry.target === footer) {
              if (entry.intersectionRatio > 0) {
                _this.classList.remove('sticky--visible');
              } else if (entry.intersectionRatio == 0 && _this.formPassed) {
                _this.classList.add('sticky--visible');
              }
            }
            if (entry.target === form) {
              let boundingRect = form.getBoundingClientRect();

              if (entry.intersectionRatio === 0 && window.scrollY > (boundingRect.top + boundingRect.height)) {
                _this.formPassed = true;
                _this.classList.add('sticky--visible');
              } else if (entry.intersectionRatio === 1) {
                _this.formPassed = false;
                _this.classList.remove('sticky--visible');
              }
            }
          });
        }, {
          threshold: [0, 1]
        }),
        form = document.getElementById(`product-form-${this.dataset.section}`),
        footer = document.getElementById('footer');
      _this.formPassed = false;
      observer.observe(form);
      observer.observe(footer);
    }
  }

  customElements.define('product-add-to-cart-sticky', ProductAddToCartSticky);
}

/**
 *  @class
 *  @function ProductSidePanelLinks
 */
if (!customElements.get('side-panel-links')) {
  class ProductSidePanelLinks extends HTMLElement {
    constructor() {
      super();
      this.links = this.querySelectorAll('button');
      this.drawer = document.getElementById('Product-Information-Drawer');
      this.buttons = this.drawer.querySelector('.side-panel-content--tabs');
      this.panels = this.drawer.querySelector('.side-panel-content--inner').querySelectorAll('.side-panel-content--tab-panel');
      this.body = document.body;
    }
    connectedCallback() {
      this.setupObservers();
    }
    disconnectedCallback() {

    }
    setupObservers() {
      this.links.forEach((item, i) => {
        item.addEventListener('click', (e) => {
          this.body.classList.add('open-cc');
          this.buttons.toggleActiveClass(i);
          this.drawer.classList.add('active');
        });
      });
    }
  }

  customElements.define('side-panel-links', ProductSidePanelLinks);
}

if (!window.productCommitmentModalInitialized) {
  window.productCommitmentModalInitialized = true;
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-commitment-modal-target]');
    if (!trigger) {
      return;
    }

    const modal = document.querySelector(trigger.dataset.commitmentModalTarget);
    if (!modal) {
      return;
    }

    const input = modal.querySelector(`.product-commitment-modal__input[value="${trigger.dataset.commitmentTab}"]`);
    if (input) {
      input.checked = true;
    }
    if (typeof modal.show === 'function') {
      modal.show(trigger);
    }
  });
}

if (!window.productOfferModalInitialized) {
  window.productOfferModalInitialized = true;
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-product-offer-modal-target]');
    if (!trigger) {
      return;
    }

    const modal = document.querySelector(trigger.dataset.productOfferModalTarget);
    if (modal && typeof modal.show === 'function') {
      modal.show(trigger);
    }
  });
}

if (!window.productOfferCopyInitialized) {
  window.productOfferCopyInitialized = true;
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-offer-copy]');
    if (!button) {
      return;
    }

    const code = button.dataset.copyCode || '';
    const copyText = button.dataset.copyText || button.textContent;
    const copiedText = button.dataset.copiedText || copyText;

    const setCopied = () => {
      button.textContent = copiedText;
      window.setTimeout(() => {
        button.textContent = copyText;
      }, 1600);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(setCopied).catch(() => {});
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopied();
    } catch (error) {
      console.warn(error);
    }
    document.body.removeChild(textarea);
  });
}