
interface Point { x: number, z: number }
interface Wall { p1: Point, p2: Point }

// Simplified intersection logic from plan
const intersectSegment = (
    p1: Point, p2: Point,
    wall1: Point, wall2: Point
): boolean => {
    const x1 = wall1.x, z1 = wall1.z;
    const x2 = wall2.x, z2 = wall2.z;
    const x3 = p1.x, z3 = p1.z;
    const x4 = p2.x, z4 = p2.z;

    const den = (x1 - x2) * (z3 - z4) - (z1 - z2) * (x3 - x4);

    if (Math.abs(den) < 0.0001) return false;

    const t = ((x1 - x3) * (z3 - z4) - (z1 - z3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (z1 - z3) - (z1 - z2) * (x1 - x3)) / den;

    // t is distance along ray (0-1). u is spot on wall (0-1).
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

// Simulation Test
const runTests = () => {
    const origin = { x: 0, z: 0 };
    const target = { x: 10, z: 0 }; // Ray to right

    console.log("Test 1: Clear path");
    const noWalls: Wall[] = [];
    const hits1 = noWalls.filter(w => intersectSegment(origin, target, w.p1, w.p2)).length;
    console.log(`Hits: ${hits1} (Expected 0)`);

    console.log("Test 2: One wall block");
    const wall1: Wall = { p1: { x: 5, z: -5 }, p2: { x: 5, z: 5 } };
    const hits2 = [wall1].filter(w => intersectSegment(origin, target, w.p1, w.p2)).length;
    console.log(`Hits: ${hits2} (Expected 1)`);

    console.log("Test 3: Two walls");
    const wall2: Wall = { p1: { x: 8, z: -5 }, p2: { x: 8, z: 5 } };
    const hits3 = [wall1, wall2].filter(w => intersectSegment(origin, target, w.p1, w.p2)).length;
    console.log(`Hits: ${hits3} (Expected 2)`);

    console.log("Test 4: Wall behind");
    const wallBehind: Wall = { p1: { x: -2, z: -5 }, p2: { x: -2, z: 5 } };
    const hits4 = [wallBehind].filter(w => intersectSegment(origin, target, w.p1, w.p2)).length;
    console.log(`Hits: ${hits4} (Expected 0)`);

    console.log("Test 5: Wall parallel");
    const wallParallel: Wall = { p1: { x: 0, z: 2 }, p2: { x: 10, z: 2 } };
    const hits5 = [wallParallel].filter(w => intersectSegment(origin, target, w.p1, w.p2)).length;
    console.log(`Hits: ${hits5} (Expected 0)`);

    console.log("Test 6: Long Range, Nearby Wall (The Bug)");
    // Ray length 100. Wall at distance 4.
    // t = 4/100 = 0.04.
    // If threshold is 0.05, this will be IGNORED (0 hits).
    const targetLong = { x: 100, z: 0 };
    const wallNear: Wall = { p1: { x: 4, z: -5 }, p2: { x: 4, z: 5 } };

    const intersectBuggy = (p1: Point, p2: Point, wall1: Point, wall2: Point) => {
        const x1 = wall1.x, z1 = wall1.z;
        const x2 = wall2.x, z2 = wall2.z;
        const x3 = p1.x, z3 = p1.z;
        const x4 = p2.x, z4 = p2.z;
        const den = (x1 - x2) * (z3 - z4) - (z1 - z2) * (x3 - x4);
        if (Math.abs(den) < 0.0001) return false;
        const t = ((x1 - x3) * (z3 - z4) - (z1 - z3) * (x3 - x4)) / den;
        const u = -((x1 - x2) * (z1 - z3) - (z1 - z2) * (x1 - x3)) / den;
        // THE BUG:
        return t > 0.05 && t <= 1 && u >= 0 && u <= 1;
    };

    const hitsBug = [wallNear].filter(w => intersectBuggy(origin, targetLong, w.p1, w.p2)).length;
    console.log(`Hits Buggy Check: ${hitsBug} (Expected 0 if bug exists)`);
}

runTests();
