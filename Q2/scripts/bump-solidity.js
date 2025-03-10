const fs = require("fs");
const solidityRegex = /pragma solidity \^\d+\.\d+\.\d+/

const verifierRegex = /contract Verifier/

changeContract("HelloWorld");
changeContract("Multiplier");
function changeContract(name) {
  let content = fs.readFileSync(`./contracts/${name}Verifier.sol`, { encoding: 'utf-8' });
  let bumped = content.replace(solidityRegex, 'pragma solidity ^0.8.0');
  bumped = bumped.replace(verifierRegex, `contract ${name}Verifier`);

  fs.writeFileSync(`./contracts/${name}Verifier.sol`, bumped);
}

// [assignment] add your own scripts below to modify the other verifier contracts you will build during the assignment
