/* Mossglen — content tables.
   Loaded as a plain script in the browser (defines MOSSGLEN_DATA) and
   require()d by the tooling in Node. No logic lives here, only content. */

var MOSSGLEN_DATA = {

  /* ------------------------------------------------------------ items */
  /* bloom = what the well gains when you drop one in. Rarer things move
     the village further, but nothing is ever the only way forward. */
  items: {
    moss:       { name: 'Moss',        bloom: 2, tags: ['soft', 'green'] },
    berries:    { name: 'Ripe berries', bloom: 2, tags: ['sweet', 'red'] },
    pebble:     { name: 'River pebble', bloom: 2, tags: ['tidy', 'stone'] },
    acorn:      { name: 'Acorn',       bloom: 2, tags: ['tidy', 'wood'] },
    reed:       { name: 'Reed',        bloom: 2, tags: ['water', 'tall'] },
    mushroom:   { name: 'Spotted cap', bloom: 3, tags: ['odd', 'red'] },
    pinecone:   { name: 'Pinecone',    bloom: 3, tags: ['tidy', 'wood'] },
    feather:    { name: 'Grey feather', bloom: 3, tags: ['soft', 'water'] },
    snailshell: { name: 'Empty shell', bloom: 3, tags: ['odd', 'water'] },
    glassbead:  { name: 'Glass bead',  bloom: 6, tags: ['odd', 'shine'] }
  },

  /* ------------------------------------------------------------ areas */
  areas: {
    clearing: {
      name: 'The Clearing',
      openAt: 0,
      sky: 'meadow',
      props: [
        { sprite: 'prop_tree', x: 4, y: 4 },
        { sprite: 'prop_tree', x: 132, y: 0 },
        { sprite: 'prop_house', x: 64, y: 30, id: 'house' },
        { sprite: 'prop_well', x: 18, y: 84, id: 'well' },
        { sprite: 'prop_signpost', x: 136, y: 100, id: 'signpost' }
      ]
    },
    pondpath: {
      name: 'The Pond Path',
      openAt: 12,
      sky: 'water',
      props: [
        { sprite: 'prop_tree', x: 2, y: 10 },
        { sprite: 'prop_tree', x: 128, y: 34 },
        { sprite: 'prop_stump', x: 138, y: 128 }
      ]
    },
    hollow: {
      name: 'The Hollow',
      openAt: 55,
      sky: 'dusk',
      props: [
        { sprite: 'prop_tree', x: 8, y: 6 },
        { sprite: 'prop_tree', x: 124, y: 16 },
        { sprite: 'prop_tree', x: 66, y: 0 },
        { sprite: 'prop_mossrock', x: 60, y: 262 }
      ]
    }
  },

  /* ------------------------------------------------------------ spots */
  /* Every spot regrows. Nothing here can be used up or missed. */
  spots: [
    { id: 'mosspatch', area: 'clearing', sprite: 'prop_mossrock', x: 16, y: 140,
      name: 'mossy rock',
      pool: [['moss', 60], ['pebble', 28], ['glassbead', 12]] },
    { id: 'berrybush', area: 'clearing', sprite: 'prop_bush_berries', x: 118, y: 172,
      name: 'berry bush',
      pool: [['berries', 62], ['moss', 20], ['snailshell', 18]] },
    { id: 'oldstump', area: 'clearing', sprite: 'prop_stump', x: 24, y: 254,
      name: 'old stump',
      pool: [['acorn', 45], ['mushroom', 33], ['pinecone', 22]] },

    { id: 'reedbed', area: 'pondpath', sprite: 'prop_reeds', x: 22, y: 196,
      name: 'reed bed',
      pool: [['reed', 55], ['feather', 30], ['snailshell', 15]] },
    { id: 'shallows', area: 'pondpath', sprite: 'prop_mossrock', x: 104, y: 244,
      name: 'shallows',
      pool: [['pebble', 45], ['snailshell', 32], ['glassbead', 23]] },

    { id: 'hollowtree', area: 'hollow', sprite: 'prop_stump', x: 104, y: 176,
      name: 'hollow tree',
      pool: [['pinecone', 40], ['acorn', 30], ['feather', 18], ['glassbead', 12]] },
    { id: 'ferns', area: 'hollow', sprite: 'prop_bush', x: 16, y: 216,
      name: 'fern patch',
      pool: [['mushroom', 48], ['moss', 34], ['reed', 18]] }
  ],

  /* ------------------------------------------------- village growth */
  /* Bloom only ever goes up. Stages are things that arrive, never things
     you can lose. */
  stages: [
    { n: 1, bloom: 0,  name: 'A quiet clearing',
      note: 'The old well is dry, and the moss has it half swallowed.' },
    { n: 2, bloom: 12, name: 'Water in the well',
      note: 'Something shifted underground. The path to the pond is walkable again.',
      opens: 'pondpath' },
    { n: 3, bloom: 55, name: 'The lantern lit',
      note: 'Bodkin hung a lantern on the signpost. The hollow no longer looks so dark.',
      opens: 'hollow' },
    { n: 4, bloom: 140, name: 'Mossglen proper',
      note: 'Somebody swept the steps. Nobody will say who.' }
  ],

  /* --------------------------------------------------- village projects */
  /* Things the village decides to build. Each one is proposed by somebody,
     costs a real pile of gathered material plus bloom, and puts a visible
     object in the world. They unlock in order, so the village keeps having
     a next thing rather than a last one. */
  projects: [
    { id: 'bench', name: 'A bench by the well', by: 'pim',
      needs: { moss: 8, pebble: 5 }, bloom: 20,
      place: { area: 'clearing', sprite: 'prop_bench', x: 48, y: 106 },
      pitch: "I've been thinking about a bench. By the well. Somewhere to sit that isn't the ground, which I've tried, and which is the ground.",
      done: "That's a bench. People are going to sit on that. I may have to go and look at it again in a minute." },

    { id: 'flowerbed', name: 'A bed of flowers by your door', by: 'marla',
      needs: { moss: 14, berries: 9 }, bloom: 55,
      place: { area: 'clearing', sprite: 'prop_flowerbed', x: 92, y: 62 },
      pitch: "Something ought to be growing by your door on purpose. Not instead of the weeds. Alongside them, so they have company.",
      done: "It'll look better in a week and better again in a month. That's the whole appeal of planting things." },

    { id: 'pondlantern', name: 'A lantern on the pond path', by: 'bodkin',
      needs: { pinecone: 12, glassbead: 2 }, bloom: 110,
      place: { area: 'pondpath', sprite: 'prop_lantern', x: 130, y: 150 },
      pitch: "The pond path wants a lantern. I've got opinions about lanterns. I've hung four and two of them are still up, which is a good ratio.",
      done: "Look at it. LOOK at it. The water's doing the thing where there's two of them now." },

    { id: 'steppingstones', name: 'Stepping stones across the shallows', by: 'marla',
      needs: { pebble: 24, reed: 14 }, bloom: 190,
      place: { area: 'pondpath', sprite: 'prop_bridge', x: 62, y: 256 },
      pitch: "You could cross at the shallows if there were stones. I've stood in that water and I'd rather other people didn't have to.",
      done: "Dry feet. It's a small thing to have built and I've thought about it four times today." },

    { id: 'hollowlantern', name: 'A light for the hollow', by: 'bodkin',
      needs: { mushroom: 16, glassbead: 4 }, bloom: 300,
      place: { area: 'hollow', sprite: 'prop_lantern', x: 78, y: 158 },
      pitch: "The hollow's got the one lantern and it is LONELY. One lantern in a dark place is just a small dark place with a witness.",
      done: "Two lanterns! The dark's gone all polite about it. Backed right off." },

    { id: 'green', name: 'The village green', by: 'pim',
      needs: { acorn: 20, moss: 28 }, bloom: 450,
      place: { area: 'clearing', sprite: 'prop_flowerbed', x: 126, y: 136 },
      unlocksPlanting: true,
      pitch: "Here's the big one. A green. Cleared, turned over, ready for planting — and then never finished, because a green is a thing you keep adding to.",
      done: "Right. It's open. Anything you bring goes in the ground and stays there, and I'd like to see how far you take it." }
  ],

  /* The endless tail. Once the green is open, anything can go into it, for
     ever, and the village visibly thickens up. The bloom price climbs so the
     currency never outruns the things there are to spend it on. */
  planting: {
    itemsEach: 5,
    bloomBase: 16,
    bloomStep: 0,
    lines: {
      pim: "Another one in. I've stopped counting, which for me is a considerable statement.",
      marla: "It's filling in. Slowly, which is the only way anything fills in properly.",
      bodkin: "MORE GREEN. I can't see it but I can feel it underfoot and it's DIFFERENT."
    }
  },

  /* --------------------------------------------------- home slots */
  homeSlots: [
    { id: 'sill',    name: 'windowsill',   x: 88,  y: 56 },
    { id: 'shelfL',  name: 'left shelf',   x: 32,  y: 106 },
    { id: 'shelfR',  name: 'right shelf',  x: 142, y: 106 },
    { id: 'table',   name: 'table',        x: 96,  y: 190 },
    { id: 'bedside', name: 'floor by the bed', x: 30, y: 258 },
    { id: 'corner',  name: 'rug',          x: 104, y: 256 }
  ],

  /* ------------------------------------------------------- villagers */
  villagers: [
    {
      id: 'pim', name: 'Pim', sprite: 'char_pim', home: 'clearing',
      x: 40, y: 200,
      likes: ['pebble', 'acorn', 'pinecone'],
      wishes: ['pebble', 'pinecone', 'glassbead'],
      lines: {
        meet: "Oh — hello. I'm Pim. I keep a list of everyone who lives here, and now I have to start it again.",

        item: {
          moss: "Moss. Good moss, that. Presses flat, dries slow, holds a shelf steady.",
          pebble: "A proper pebble. Flat on one side. You could stand something on that.",
          acorn: "One acorn is a snack and forty acorns is a winter. You have one.",
          mushroom: "Don't eat it. I'm not saying it's bad, I'm saying I don't know, and those are different.",
          glassbead: "Where — no. No, don't tell me yet. Let me be surprised about it for a minute.",
          snailshell: "Empty. Whoever lived in that has moved on and left it tidy. I respect that.",
          any: "Into the bag with it, then. Things add up faster than people expect."
        },

        home: {
          pebble: "You put the pebble on the sill. I looked at it on my way past. Twice, actually.",
          acorn: "There's an acorn in your house doing nothing at all, and it suits the room.",
          pinecone: "A pinecone indoors. That's the sort of thing that makes a room look decided-on.",
          any: "Your place is looking arranged. Not tidy — arranged. Better word."
        },

        stage: {
          2: "There's water in the well. I checked it four times and it's still there.",
          3: "A lantern. Now the path has an opinion about where it goes.",
          4: "Somebody swept the steps. I've made a note. I have not made an accusation."
        },

        hint: {
          pondpath: "The pond path is under all that. If the well ever fills, the ground down there firms up. That's how it went before.",
          hollow: "There's a hollow past the signpost. Too dark to bother with. A light would fix that."
        },

        wishLines: {
          pebble: "I'm after a flat pebble, if one turns up. My shelf has a lean on it and I've stopped pretending it doesn't.",
          pinecone: "Next thing on my list is a pinecone. Not for anything. It's just been on the list a while and I'd like to cross it off.",
          glassbead: "A glass bead. I've heard they come out of the wet ground. I'd like to hold one before I decide whether I believe in them."
        },

        thanks: {
          pebble: "Oh — that's the one. That's exactly the one. The shelf's level. I may sit and look at it.",
          pinecone: "Crossed off. Do you know how long that's been on there? Neither do I. That's how long.",
          glassbead: "…Right. Yes. They're real. I'm putting it on the windowsill and I'm not going to be sensible about it."
        },

        idle: {
          morning: [
            "Morning. I've been up since it was still deciding whether to be morning.",
            "Three things to do today. I've done one. It was getting up.",
            "The light comes in over the stump first. Every day. You could set a clock by the stump.",
            "I like a morning where nothing's happened yet. All that room in it."
          ],
          day: [
            "I'm not busy. I'm just always doing something. There's a difference and I've stopped explaining it.",
            "You walk about a lot. That's a job too, noticing things. Somebody has to.",
            "I counted the bushes. There are the same number as yesterday. It's good to be sure.",
            "Every so often I put something down and never pick it up again, and the clearing keeps it. Fair arrangement."
          ],
          evening: [
            "The light goes orange and everything looks like it's been kept somewhere warm.",
            "This is the part of the day I'd keep, if I only got to keep one part.",
            "I'll head in soon. I say that at this hour every day and it's true about half of it.",
            "Whatever didn't get done today has gone quiet about it. Decent of it."
          ],
          night: [
            "Still out? Good. Nothing needs doing. That's rather the point of it.",
            "Quiet as anything. Even the well's stopped having opinions.",
            "I'm awake because I like it, not because I have to be. Took me years to tell those apart.",
            "The list keeps till morning. I've tested this. Several times."
          ]
        }
      }
    },

    {
      id: 'marla', name: 'Marla', sprite: 'char_marla', home: 'clearing',
      x: 112, y: 118,
      likes: ['feather', 'reed', 'snailshell'],
      wishes: ['reed', 'snailshell', 'feather'],
      lines: {
        meet: "You're new. Stand there a moment — no, don't answer. I only wanted to see how you stand.",

        item: {
          berries: "They stain. That's not a warning, it's just something that happens.",
          feather: "Mine, probably. I leave them all over. I'd rather they were found than swept.",
          reed: "Reeds sound like rain when the wind's right. You've picked up a bit of weather.",
          moss: "Soft things are underrated. Everything hard was soft once, given long enough.",
          snailshell: "It's a house with nobody home. I find that more restful than sad.",
          glassbead: "Something round and lit from inside. Hold onto that a while before you decide what it's for.",
          any: "Take it slowly. Nothing you found is going anywhere."
        },

        home: {
          feather: "You kept the feather. Indoors. That's a strange kindness and I've thought about it more than once.",
          reed: "There's a reed standing in your window. From outside it looks like the pond leaned in.",
          snailshell: "An empty shell on a shelf. Somebody's whole life, kept for the shape of it.",
          any: "Your window's worth looking into now. I don't look in. But it's worth it."
        },

        stage: {
          2: "The well's holding water. I'd stopped expecting it, which is not the same as minding.",
          3: "The lantern makes the puddles look like more lanterns. That's fair value.",
          4: "It's becoming a place instead of a spot. Slowly. Slowly is how it holds."
        },

        hint: {
          pondpath: "There's water south of here, under the reeds. Not reachable yet. Water waits well.",
          hollow: "The hollow's darker than dark. I don't go. Light changes what a place is."
        },

        wishLines: {
          reed: "Bring me a reed sometime. I want to hold something that's still got the pond in it.",
          snailshell: "If you find an empty shell, I'd take it. I like objects that have finished being needed.",
          feather: "One of my own feathers, if you come across one. I'd like to see what I look like from outside."
        },

        thanks: {
          reed: "There. Still cold at the cut end. Thank you — I mean that in the slow way, not the quick one.",
          snailshell: "It's lighter than it looks, isn't it. Everything that's done being lived in is.",
          feather: "Grey. I'd have guessed browner. Well. You learn something and then you're older."
        },

        idle: {
          morning: [
            "The mist sits on the low ground till about eight. Then it decides to be air again.",
            "I've been standing here a while. Not waiting. Just standing.",
            "Morning smells like cut grass and cold stone. Both. At once.",
            "The first hour is the honest one. Nothing's had time to be arranged yet."
          ],
          day: [
            "You can hear the whole clearing if you stop moving for long enough. Try it sometime. Not now.",
            "I fish, in the sense that I stand near water with intent.",
            "There's a cloud shaped like nothing at all. Those are the good ones.",
            "Somebody's always going somewhere. I find it restful to be the fixed point."
          ],
          evening: [
            "The light goes long and thin at this hour. Everything gets a shadow twice its size and doesn't mind.",
            "I like the hour where you can't quite read but haven't lit anything yet.",
            "The birds hand the evening over to the frogs. It's very organised, actually.",
            "Warm air off the stones, cool air off the water. You can stand right on the seam."
          ],
          night: [
            "The pond holds the sky at night. Same sky. Better frame.",
            "I sleep standing. It alarms people. It shouldn't.",
            "Nothing's wrong. It's just dark. Those get confused a lot.",
            "There's a sound the reeds make at night that I've never once managed to describe."
          ]
        }
      }
    },

    {
      id: 'bodkin', name: 'Bodkin', sprite: 'char_bodkin', home: 'clearing',
      x: 78, y: 252,
      likes: ['glassbead', 'mushroom', 'snailshell'],
      wishes: ['mushroom', 'acorn', 'glassbead'],
      lines: {
        meet: "Oh! Oh, a person. I'm Bodkin. I dig. Not for anything specific. That's a common misunderstanding.",

        item: {
          glassbead: "A BEAD. A glass one! I've dug for eleven years and turned up two spoons and a boot!",
          mushroom: "That's a spotted cap. They come up overnight and they're very smug about it.",
          pebble: "Ah, you've got a stone. I've got about nine hundred. We should not compare collections.",
          pinecone: "Pinecone! Those are wooden flowers, is my theory. Nobody's disproved it because nobody's tried.",
          snailshell: "I found one of those once and put it back in case they wanted it. They didn't. It's still there.",
          moss: "Moss grows on the north side, they say. It grows on my side, is what I've observed.",
          any: "Ooh, what've you — no, don't tell me. Actually do tell me. I've changed my mind."
        },

        home: {
          glassbead: "You've put the BEAD in your HOUSE. I walked past four times. I'm going to walk past again.",
          mushroom: "There's a spotted cap on your table. Is it a decoration or is it waiting? Either's fine!",
          snailshell: "A shell in the corner. Very nice. Slightly haunted. In a good way. In the best way.",
          any: "I looked in your window. Not in a creeping way — in an admiring way, which is legally different."
        },

        stage: {
          2: "The well's WET. I put my hand in it. It was wet! I'm telling everyone!",
          3: "I hung the lantern. Took three goes. The first two were also lanterns, but lower down.",
          4: "Someone swept the steps and it wasn't me, and I've decided that's lovely and not suspicious."
        },

        hint: {
          pondpath: "There's a whole path down south gone soggy. Water in the well would firm it up, I reckon. I don't know why. I reckon it though.",
          hollow: "Past the signpost it goes dark quick. I'd go in with a light. I would not go in without one, and I go most places."
        },

        wishLines: {
          mushroom: "Could you get me a spotted cap? I want to put it somewhere and check on it. That's the whole plan.",
          acorn: "An acorn, if you've got a spare! I'm going to plant it and then be extremely patient at it.",
          glassbead: "A glass bead. I know. I KNOW. I've asked everyone. You're the only one who goes anywhere."
        },

        thanks: {
          mushroom: "Ohh, it's got the spots and everything. I'm going to check on it constantly. It'll hate that.",
          acorn: "Right. In the ground it goes. See you in ninety years, tree. Bring snacks.",
          glassbead: "I'm holding a bead. A GLASS one. Eleven years, two spoons, one boot, and now this. Worth it. Worth all of it."
        },

        idle: {
          morning: [
            "Morning! I've already dug a hole and filled it in. Productive.",
            "I woke up facing the wrong way and had a lovely little panic about it. All sorted.",
            "You can smell rain coming through the soil before you can see it in the sky. Underground gossip.",
            "Everything's damp and nobody's ruined anything yet. Best part of the day."
          ],
          day: [
            "I can't see very well, so I've decided everything is going nicely.",
            "Did you know there's more down than there is across? Think about it. Don't hurt yourself.",
            "I'm digging toward something. I'll know what when I get there.",
            "Somebody moved a stone about a foot and I noticed instantly. That's my one skill and I'm proud of it."
          ],
          evening: [
            "Everything's gone gold. Even me! I've checked my hands twice.",
            "This is when the worms come up to hear about my day. Or for other reasons.",
            "I like the evening. It's the day, but relaxed about it.",
            "Warm ground, cool air. The soil's got the day still in it. I sit on it."
          ],
          night: [
            "Night's just day with the lid on. Doesn't bother me. Nothing does, down there.",
            "Look up! No — I can't either. But I'm told it's very good.",
            "I dig at night as well. It's the same dark, so it's no extra trouble.",
            "You're out late. So am I. Neither of us is going to be sensible about it, are we."
          ]
        }
      }
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) module.exports = MOSSGLEN_DATA;
