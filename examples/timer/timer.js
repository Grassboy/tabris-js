var MARGIN = 16;
var MARGIN_LARGE = 24;

var cpsCount = 0;
var startTime = new Date().getTime();
var taskId;

var page = new tabris.Page({
  title: 'Setting timers and intervals',
  topLevel: true
});

var statusTextView = new tabris.TextView({
  text: 'Last update: <none>',
  layoutData: {left: MARGIN, top: MARGIN_LARGE, right: MARGIN}
}).appendTo(page);

var cpsTextView = new tabris.TextView({
  text: 'Calls per second: <none>',
  layoutData: {left: MARGIN, top: [statusTextView, MARGIN], right: MARGIN}
}).appendTo(page);

var delayTextView = new tabris.TextView({
  text: 'Delay (ms):',
  layoutData: {left: MARGIN, baseline: '#delayTextInput'}
}).appendTo(page);

var delayTextInput = new tabris.TextInput({
  id: 'delayTextInput',
  text: '1000',
  message: 'Delay (ms)',
  layoutData: {left: [delayTextView, MARGIN], top: [cpsTextView, MARGIN_LARGE]}
}).appendTo(page);

var repeatCheckbox = new tabris.CheckBox({
  text: 'Repeat',
  layoutData: {left: MARGIN, top: delayTextInput}
}).appendTo(page);

var startButton = new tabris.Button({
  text: 'Start timer',
  layoutData: {left: ['50%', MARGIN / 4], top: [repeatCheckbox, MARGIN_LARGE], right: MARGIN}
}).on('select', function() {
  var delay = parseInt(delayTextInput.text);
  if (repeatCheckbox.selection) {
    taskId = setInterval(updateStatusTextViews, delay);
  } else {
    taskId = setTimeout(function() {
      updateStatusTextViews();
      enableTimerStart(true);
    }, delay);
  }
  enableTimerStart(false);
}).appendTo(page);

var cancelButton = new tabris.Button({
  text: 'Cancel timer',
  selection: false,
  layoutData: {left: MARGIN, top: [repeatCheckbox, MARGIN_LARGE], right: ['50%', MARGIN / 4]}
}).on('select', function() {
  clearTimeout(taskId);
  enableTimerStart(true);
}).appendTo(page);

page.open();

function updateStatusTextViews() {
  cpsCount++;
  var curTime = new Date().getTime();
  var diff = curTime - startTime;
  if (diff >= 1000) {
    cpsTextView.set('text', 'Calls per second: ' + cpsCount);
    cpsCount = 0;
    startTime = curTime;
  }
  statusTextView.set('text', 'Last update: ' + new Date().getTime().toString());
}

function enableTimerStart(available) {
  startButton.set('enabled', available);
  cancelButton.set('enabled', !available);
}
