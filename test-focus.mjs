const button = { focus: () => { button.focused = true; } };
button.focus();
if (button.focused) console.log("Test passed!");
