DateInput = (function($) { // Localise the $ function

function DateInput(el, opts) {
  if (typeof(opts) != "object") opts = {};
  $.extend(this, DateInput.DEFAULT_OPTS, opts);
  
  this.input = $(el);
  this.bindMethodsToObj("show", "hide", "hideIfClickOutside", "hideOnEscOrTab", "keydownHandler", "selectDate", "prevMonth", "nextMonth");
  
  this.build();
  this.selectDate();
  this.hide();
};
DateInput.DEFAULT_OPTS = {
  month_names: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  short_month_names: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  short_day_names: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  start_of_week: 1
};
DateInput.prototype = {
  build: function() {
    var monthNav = $('<p class="month_nav">' +
      '<a href="#" class="prev">&laquo;</a>' +
      ' <span class="month_name"></span> ' +
      '<a href="#" class="next">&raquo;</a>' +
      '</p>');
    this.monthNameSpan = $(".month_name", monthNav);
    $(".prev", monthNav).click(this.prevMonth);
    $(".next", monthNav).click(this.nextMonth);
    
    var tableShell = "<table><thead><tr>";
    $(this.adjustDays(this.short_day_names)).each(function() {
      tableShell += "<th>" + this + "</th>";
    });
    tableShell += "</tr></thead><tbody></tbody></table>";
    
    this.rootLayers = $(this.input).wrap(document.createElement('span'));
		this.dateSelector = $('<div class="date_selector"></div>').append(monthNav, tableShell).insertAfter(this.input);
    
    if ($.browser.msie && $.browser.version < 7) {
      this.ieframe = $('<iframe class="date_selector_ieframe" frameborder="0" src="#"></iframe>').insertBefore(this.dateSelector);
      this.rootLayers = this.rootLayers.add(this.ieframe);
    };
    
    this.tbody = $("tbody", this.dateSelector);
    
    // The anon function ensures the event is discarded
    this.input.change(this.bindToObj(function() { this.selectDate(); }));
  },

  selectMonth: function(date) {
    this.currentMonth = date;
   
    var rangeStart = this.rangeStart(date), rangeEnd = this.rangeEnd(date);
    if (this.lastRange == rangeStart+' '+rangeEnd) {
			$('td', this.tbody).removeClass("selected");
			return;
    }
    this.lastRange = rangeStart+' '+rangeEnd;

    var numDays = this.daysBetween(rangeStart, rangeEnd);
    var dayCells = "";
    
    for (var i = 0; i <= numDays; i++) {
      var currentDay = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + i, 12, 00);
      
      if (this.isFirstDayOfWeek(currentDay)) dayCells += "<tr>";
      
      if (currentDay.getMonth() == date.getMonth()) {
        dayCells += '<td class="selectable_day" date="' + this.dateToString(currentDay) + '">' + currentDay.getDate() + '</td>';
      } else {
        dayCells += '<td class="unselected_month" date="' + this.dateToString(currentDay) + '">' + currentDay.getDate() + '</td>';
      };
      
      if (this.isLastDayOfWeek(currentDay)) dayCells += "</tr>";
    };
    
    this.monthNameSpan.empty().append(this.monthName(date) + " " + date.getFullYear());
    this.tbody.empty().append(dayCells);
    
    $(".selectable_day", this.tbody).click(this.bindToObj(function(event) {
      this.selectDate(this.stringToDate($(event.target).attr("date")));
      this.hide();
      return false;
    }));
    
    $("td[date=" + this.dateToString(new Date()) + "]", this.tbody).addClass("today");
  },
  
  selectDate: function(date) {
    if (typeof(date) == "undefined") {
      date = this.stringToDate(this.input.val());
    };
    
    if (date) {
      this.selectedDate = date;
      this.selectMonth(date);
      var stringDate = this.dateToString(date);
      $('td[date=' + stringDate + ']', this.tbody).addClass("selected");
      
      if (this.input.val() != stringDate) {
        this.input.val(stringDate).change();
      };
    } else {
      this.selectMonth(new Date());
      this.selectedDate = new Date(); // for keyboard handler to work without a prior mouse selection
    };
  },
  
  show: function() {
    this.dateSelector.css("display", "block");
    this.setPosition();
    this.input.unbind("focus", this.show).keydown(this.keydownHandler);
    $([window, document.body]).click(this.hideIfClickOutside).keyup(this.hideOnEscOrTab);
  },
  
  hide: function() {
    this.dateSelector.css("display", "none");
    $([window, document.body]).unbind("click", this.hideIfClickOutside).unbind("keyup", this.hideOnEscOrTab);
    this.input.unbind("keydown", this.keydownHandler).focus(this.show);
  },
  
  hideIfClickOutside: function(event) {
    if (event.target != this.input[0] && !this.insideSelector(event)) {
      this.hide();
    };
  },
  
  hideOnEsc: function(event) {
    if (event.keyCode == 27 || event.keyCode == 9)
      this.hide();
  },
  
	keydownHandler: function(event) {
		switch (event.keyCode)
		{
			case 9: // tab
				this.hide();
				return;
			break;
			case 33: // page up
				this.moveMonthBy(-1);
			break;
			case 34: // page down
				this.moveMonthBy(1);
			break;
			case 38: // up
				this.moveDateBy(-7);
			break;
			case 40: // down
				this.moveDateBy(7);
			break;
			case 37: // left
				this.moveDateBy(-1);
			break;
			case 39: // right
				this.moveDateBy(1);
			break;
			default:
				return;
		}
		event.preventDefault();
	},
  
  stringToDate: function(string) {
    var matches;
    if (matches = string.match(/^(\d{1,2}) ([^\s]+) (\d{4,4})$/)) {
      return new Date(matches[3], this.shortMonthNum(matches[2]), matches[1], 12, 00);
    } else {
      return null;
    };
  },
  
  dateToString: function(date) {
    return date.getDate() + " " + this.short_month_names[date.getMonth()] + " " + date.getFullYear();
  },
  
  setPosition: function() {
    var offset = this.input.offset();
    this.dateSelector.css({
      top: offset.top + this.input.outerHeight(),
      left: offset.left
    });
    
    if (this.ieframe) {
      this.ieframe.css({
        width: this.dateSelector.outerWidth(),
        height: this.dateSelector.outerHeight()
      });
    };
  },

  moveDateBy: function(amount) {
    this.selectDate(new Date(this.selectedDate.setDate(this.selectedDate.getDate() + amount)));
  },
  
  moveMonthBy: function(amount) {
    this.selectDate(new Date(this.selectedDate.setMonth(this.currentMonth.getMonth() + amount)));
  },
  
  prevMonth: function() {
    this.moveMonthBy(-1);
    return false;
  },
  
  nextMonth: function() {
    this.moveMonthBy(1);
    return false;
  },
  
  monthName: function(date) {
    return this.month_names[date.getMonth()];
  },
  
  insideSelector: function(event) {
    var offset = this.dateSelector.offset();
    offset.right = offset.left + this.dateSelector.outerWidth();
    offset.bottom = offset.top + this.dateSelector.outerHeight();
    
    return event.pageY < offset.bottom &&
           event.pageY > offset.top &&
           event.pageX < offset.right &&
           event.pageX > offset.left;
  },
  
  bindToObj: function(fn) {
    var self = this;
    return function() { return fn.apply(self, arguments) };
  },
  
  bindMethodsToObj: function() {
    for (var i = 0; i < arguments.length; i++) {
      this[arguments[i]] = this.bindToObj(this[arguments[i]]);
    };
  },
  
  indexFor: function(array, value) {
    for (var i = 0; i < array.length; i++) {
      if (value == array[i]) return i;
    };
  },
  
  monthNum: function(month_name) {
    return this.indexFor(this.month_names, month_name);
  },
  
  shortMonthNum: function(month_name) {
    return this.indexFor(this.short_month_names, month_name);
  },
  
  shortDayNum: function(day_name) {
    return this.indexFor(this.short_day_names, day_name);
  },
  
  daysBetween: function(start, end) {
    start = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    end = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return (end - start) / 86400000;
  },
  
  changeDayTo: function(to, date, direction) {
    var difference = direction * (Math.abs(date.getDay() - to - (direction * 7)) % 7);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + difference);
  },
  
  rangeStart: function(date) {
    return this.changeDayTo(this.start_of_week, new Date(date.getFullYear(), date.getMonth()), -1);
  },
  
  rangeEnd: function(date) {
    return this.changeDayTo((this.start_of_week - 1) % 7, new Date(date.getFullYear(), date.getMonth() + 1, 0), 1);
  },
  
  isFirstDayOfWeek: function(date) {
    return date.getDay() == this.start_of_week;
  },
  
  isLastDayOfWeek: function(date) {
    return date.getDay() == (this.start_of_week - 1) % 7;
  },
  
  adjustDays: function(days) {
    var newDays = [];
    for (var i = 0; i < days.length; i++) {
      newDays[i] = days[(i + this.start_of_week) % 7];
    };
    return newDays;
  }
};

$.fn.date_input = function(opts) {
  return this.each(function() { new DateInput(this, opts); });
};
$.date_input = { initialize: function(opts) {
  $("input.date_input").date_input(opts);
} };

return DateInput;
})(jQuery); // End localisation of the $ function
