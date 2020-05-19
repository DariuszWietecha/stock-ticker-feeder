const readline = require("readline");

/**
 * @returns {void}
 */
const clearConsole = () => {
  const blank = "\n".repeat(process.stdout.rows);
  console.log(blank);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
};

/**
 * @param {number} counter
 * @returns {void}
 */
const displayProgresIndicator = (counter) => {
  const toDisplay = counter % 2 === 0 ? "|" : "-";
  readline.cursorTo(process.stdout, 0, 7);
  readline.clearLine(process.stdout, 0);

  console.log(toDisplay);
};

exports.clearConsole = clearConsole;
exports.displayProgresIndicator = displayProgresIndicator;