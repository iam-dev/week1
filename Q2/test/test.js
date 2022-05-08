const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { groth16, plonk } = require("snarkjs");

function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

describe("HelloWorld", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("HelloWorldVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        // Step 1 prover proove and generate wasm and zero knowlegde key
        const { proof, publicSignals } = await groth16.fullProve({"a":"1","b":"2"}, "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm","contracts/circuits/HelloWorld/circuit_final.zkey");
        console.log('proof', proof);
        console.log('publicSignals', publicSignals);


        // publicSignals[0] should return 2 
        console.log('1x2 =', publicSignals[0]);

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        console.log('editedPublicSignals', editedPublicSignals);
        const editedProof = unstringifyBigInts(proof);
        console.log('editedProof', editedProof);
        // generate callData that can be use for smart contract input using groth16
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
        console.log(argv);
        const a = [argv[0], argv[1]];
        console.log("a", a);
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        console.log("b", b);
        const c = [argv[6], argv[7]];
        console.log("c", c);
        const Input = argv.slice(8);
        console.log("Input", Input);

        // Verify inputs!: check the smart contract verifyProof function
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with Groth16", function () {
    let MultiplierVerifier;
    let multiplierVerifier;
    beforeEach(async function () {
        MultiplierVerifier = await ethers.getContractFactory("MultiplierVerifier");
        multiplierVerifier = await MultiplierVerifier.deploy();
        await multiplierVerifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        // Step 1 prover proove and generate wasm and zero knowlegde key
        const { proof, publicSignals } = await groth16.fullProve({"a":"1","b":"2", "c": "3"}, "contracts/circuits/Multiplier/Multiplier3_js/Multiplier3.wasm","contracts/circuits/Multiplier/circuit_final.zkey");

        console.log('1x2x3 =',publicSignals[0]);

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);
        // generate callData that can be use for smart contract input using groth16
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
        console.log(argv);
    
        const a = [argv[0], argv[1]];
        console.log("a", a);
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        console.log("b", b);
        const c = [argv[6], argv[7]];
        console.log("c", c);
        const Input = argv.slice(8);
        console.log("Input", Input);
        // Verify proof within Groth16 Smart contract
        expect(await multiplierVerifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await multiplierVerifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with PLONK", function () {
    let MultiplierPlonkVerifier;
    let multiplierPlonkVerifier;
    beforeEach(async function () {
        MultiplierPlonkVerifier = await ethers.getContractFactory("PlonkVerifier");
        multiplierPlonkVerifier = await MultiplierPlonkVerifier.deploy();
        await multiplierPlonkVerifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        const { proof, publicSignals } = await plonk.fullProve({"a":"1","b":"2", "c": "3"}, "contracts/circuits/Multiplier/_plonk/Multiplier3_js/Multiplier3.wasm","contracts/circuits/Multiplier/_plonk/circuit_final.zkey");

        console.log('1x2x3 =',publicSignals[0]);

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);
        // generate callData that can be use for smart contract input using PLONK
        const calldata = await plonk.exportSolidityCallData(editedProof, editedPublicSignals);
        console.log("calldata", calldata);
        // calldata needs to be seperated
        const [proofData, inputData] = calldata.split(",");

        const argv = inputData.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
        console.log("argv", argv);
    
        // Verify proof within PLONK Smart contract
        expect(await multiplierPlonkVerifier.verifyProof(proofData, argv)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        const proofData = 0;
        const argv = [0];
        expect(await multiplierPlonkVerifier.verifyProof(proofData, argv)).to.be.false;
    });
});