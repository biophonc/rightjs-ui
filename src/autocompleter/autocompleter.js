/**
 * The RightJS UI Autocompleter unit base class
 *
 * Copyright (C) Nikolay V. Nemshilov aka St.
 */
var Autocompleter = new Class(Observer, {
  extend: {
    EVENTS: $w('show hide update load select done'),
    
    Options: {
      url:        document.location.href,
      param:      'search',
      method:     'get',
      
      minLength:  1,         // the minimal length when it starts work
      threshold:  200,       // the typing pause threshold
      
      cache:      true,      // the use the results cache
      local:      null,      // an optional local search results list
      
      fxName:     'slide',
      fxDuration: 'short',
      
      spinner:    'native',
      
      relName:    'autocompleter'
    }
  },
  
  /**
   * basic constructor
   *
   * @param mixed the input element reference, a string id or the element instance
   * @param Object options
   */
  initialize: function(input, options) {
    this.$super(options);
    
    this.input     = $(input).onKeyup(this.watch.bind(this)).onBlur(this.hide.bind(this));
    this.container = $E('div', {'class': 'autocompleter'}).insertTo(this.input, 'after');
  },
  
  // catching up with some additonal options
  setOptions: function(options) {
    this.$super(options);
    
    // building the correct url template with a placeholder
    if (!this.options.url.includes('%{search}')) {
      this.options.url = (this.options.url.includes('?') ? '&' : '?') + this.options.param + '=%{search}';
    }
  },
  
  // handles the list appearance
  show: function() {
    if (this.container.hidden()) {
      var dims = this.input.dimensions();
      
      this.container.setStyle({
        top: (dims.top + dims.height) + 'px',
        left: dims.left + 'px',
        width: (dims.width - 2) + 'px'
      }).show(this.options.fxName, {
        duration: this.options.fxDuration,
        onFinish: this.fire.bind(this, 'show')
      });
    }
    
    return Autocompleter.current = this;
  },
  
  // handles the list hidding
  hide: function() {
    if (this.container.visible()) {
      this.container.hide();
      this.fire.bind(this, 'hide');
    }
    
    Autocompleter.current = null;
    
    return this;
  },
  
  // selects the next item on the list
  prev: function() {
    return this.select('prev', this.container.select('li').last());
  },
  
  // selects the next item on the list
  next: function() {
    return this.select('next', this.container.first('li'));
  },
  
  // marks it done
  done: function(current) {
    var current = current || this.container.first('li.current');
    if (current) {
      this.input.value = current.innerHTML.stripTags();
    }
    
    return this.fire('done').hide();
  },
  
// protected

  // works with the 'prev' and 'next' methods
  select: function(what, fallback) {
    var current = this.container.first('li.current');
    if (current) {
      current = current[what]('li') || current;
    }
    
    return this.fire('select', (current || fallback).radioClass('current'));
  },

  // receives the keyboard events out of the input element
  watch: function(event) {
    // skip the overlaping key codes that are already watched in the hooker.js
    if ([27,37,38,39,40,13].include(event.keyCode)) return;
    
    if (this.input.value.length >= this.options.minLength) {
      if (this.timeout) {
        this.timeout.cancel();
      }
      this.timeout = this.trigger.bind(this).delay(this.options.threshold);
    }
  },
  
  // triggers the actual action
  trigger: function() {
    this.timeout = null;
    
    this.cache = this.cache || {};
    var search = this.input.value;
    
    if (this.cache[search]) {
      this.suggest(this.cache[search], search);
    } else if (this.options.local) {
      this.suggest(this.findLocal(search), search);
    } else {
      Xhr.load(this.options.url.replace('%{search}', encodeURIComponent(search)), {
        method:  this.options.method,
        spinner: this.options.spinner,
        onComplete: function(response) {
          this.fire('load').suggest(response.responseText, search);
        }.bind(this)
      });
    }
  },
  
  // updates the suggestions list
  suggest: function(result, search) {
    this.container.update(result).select('li').each(function(li) {
      // we reassiging the events each time so the were no doublecalls
      li.onmouseover = function() { li.radioClass('current'); };
      li.onmousedown = function() { this.done(li); }.bind(this);
    }, this);
    
    // saving the result in cache
    if (this.options.cache) {
      this.cache[search] = result;
    }
    
    return this.fire('update').show();
  },
  
  // performs the locals search
  findLocal: function(search) {
    return $E('ul').insert(
      this.options.local.map(function(option) {
        if (option.includes(search)) {
          return $E('li', {html:
            option.replace(new RegExp("("+RegExp.escape(search)+")", 'g'), '<strong>$1</strong>')
          });
        }
      }).compact()
    );
  }
});