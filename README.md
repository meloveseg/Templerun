# Energy Trail

A small, original browser runner inspired by the endless-runner genre. The main remix is an energy-limited jump: change lanes freely, or spend energy to clear a gate when moving sideways is unsafe. The runner, gates, and jungle are drawn from simple shapes; no Temple Run characters or artwork are copied.

## Run it

Open `index.html` in a current web browser. No install, account, or extra files are needed. If a browser blocks local files, serve this folder with any static web server and open its `index.html` page.

## Rules

1. Select **Start run**. The runner begins in the center lane; gates approach automatically in a repeating center, left, right pattern.
2. Press **←** or **→** to move one lane. You can change lanes at any time while the run is active. At the left or right edge, an extra move outward does nothing.
3. Press **Space** (or **Jump**) to vault a gate. A jump costs 40 of 100 energy, lasts about 0.6 seconds, and can only start while grounded. Energy returns at 18 points per second while grounded, up to 100. If there is less than 40 energy, the jump is blocked with a message.
4. A gate ends the run if it reaches the runner in the same lane while the runner is grounded. A gate in another lane is safe. Survive to increase the distance score by 10 meters per second.
5. After a collision, the score stops. Choose **Run again** to reset the score, lane, energy, and approaching gates.

The **Next gate** label names the closest approaching gate so you can choose whether to change lanes or spend energy jumping.

**Example choice:** if a gate is approaching the center and the left lane is open, move left and keep all your energy. If both side lanes feel unsafe, stay put and spend 40 energy to jump over the gate. The lane and energy mechanics work together: one is free but changes position, while the other keeps position but has a limited resource.

## Controls

- **← / →:** change lanes
- **Space:** jump using energy
- On-screen **Lane** and **Jump** buttons also work with a mouse or touch.
- **Start run / Run again:** begin or restart.

## Repeatable first-version checks

| Test | Action | Expected result |
| --- | --- | --- |
| Start and lane change | Start a run, press **←** once, then **→** once. | The lane label changes left, then returns to center; the run continues. |
| Energy boundary | Start a run and press **Space** twice, waiting until the first jump ends. Then press **Space** again. | The first jump takes energy from 100 to 60. The second spends 40 while some energy has recharged; the next jump is rejected if the meter is below 40, with a clear message. |
| Lane boundary | Start a run, press **←** twice. | First move selects left; the second stays left and explains the boundary. |
| Collision and restart | Start a run and do not move or jump. | The center gate ends the run; the score freezes and **Run again** appears. Restart returns the runner to center with 100 energy and score 0. |

## Design and testing note

I kept the art geometric so the first build could focus on the rule instead of copied characters. The important interaction is between lane choice and energy: switching lanes costs nothing, while jumping is the fallback when a lane change is not safe.

**Browser try:** On my first run, I moved left to avoid a center gate and got caught by the following left-lane gate. The run ended as designed, but it showed me the next hazard needed a clearer cue. I added the **Next gate** label, then restarted and pressed **←** and **Space**; the runner moved left and the energy meter changed from 100 to 60 while the run continued. I chose not to add copied Temple Run art or extra moves because the first version should make the energy decision easy to test.
