"""
Mossglen sprite generator.

Emits native-resolution (1x) pixel-art PNGs into ../assets/.
The game scales them with imageSmoothingEnabled=false, so 1x on disk keeps
the files tiny and lets the canvas own the zoom factor.

Sprites are authored as ASCII rows against a single shared palette. That is
deliberate: one palette for the whole world is what makes the screen read as
one place, and ASCII means the source is its own debug view.

Run:  python tools/sprites.py
"""

import os
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- palette
# Light comes from the top-left in every sprite. Each material has a light /
# mid / dark ramp with a hue shift toward yellow in the light and toward
# purple in the dark, so nothing looks like a plastic gradient.
PAL = {
    '.': (0, 0, 0, 0),
    '#': (43, 33, 51, 255),        # ink — warm dark purple, never pure black

    'A': (154, 200, 106, 255),     # leaf light
    'B': (108, 160, 72, 255),      # leaf mid
    'C': (66, 110, 50, 255),       # leaf dark
    'D': (42, 74, 40, 255),        # leaf deepest

    'E': (201, 154, 99, 255),      # wood light
    'F': (163, 112, 63, 255),      # wood mid
    'G': (113, 74, 40, 255),       # wood dark
    'H': (74, 47, 28, 255),        # wood deepest

    'I': (247, 233, 208, 255),     # cream light
    'J': (224, 196, 155, 255),     # cream mid
    'K': (185, 143, 99, 255),      # cream dark

    'L': (232, 132, 110, 255),     # red light
    'M': (204, 78, 84, 255),       # red mid
    'N': (140, 48, 62, 255),       # red dark

    'O': (168, 214, 226, 255),     # blue light
    'P': (110, 168, 194, 255),     # blue mid
    'Q': (66, 112, 145, 255),      # blue dark

    'R': (204, 197, 186, 255),     # stone light
    'S': (158, 148, 137, 255),     # stone mid
    'T': (110, 101, 92, 255),      # stone dark

    'U': (245, 205, 116, 255),     # gold
    'V': (216, 160, 200, 255),     # petal pink
    'W': (168, 140, 196, 255),     # dusk purple
    'X': (250, 246, 236, 255),     # off-white
    'Y': (92, 78, 96, 255),        # velvet dark (mole)
    'Z': (134, 118, 138, 255),     # velvet light (mole)

    '1': (222, 168, 104, 255),     # cloth light
    '2': (186, 124, 72, 255),      # cloth mid
    '3': (140, 86, 52, 255),       # cloth dark
    '4': (120, 196, 168, 255),     # teal light
    '5': (72, 148, 132, 255),      # teal mid
}


def save(name, rows):
    """Validate a block of ASCII rows, then write it out at 1x."""
    w = len(rows[0])
    for i, r in enumerate(rows):
        if len(r) != w:
            raise SystemExit(
                "%s row %d is %d chars, expected %d:\n  |%s|" % (name, i, len(r), w, r))
        for ch in r:
            if ch not in PAL:
                raise SystemExit("%s row %d: unknown char %r" % (name, i, ch))
    h = len(rows)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = PAL[rows[y][x]]
    img.save(os.path.join(OUT, name + ".png"))
    return (name, w, h)


def orphan_report(name, rows):
    """Flag lone coloured pixels — the classic generated-pixel-art tell."""
    h, w = len(rows), len(rows[0])
    bad = []
    for y in range(h):
        for x in range(w):
            c = rows[y][x]
            if c in '.#':
                continue
            nb = 0
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and rows[ny][nx] == c:
                    nb += 1
            if nb == 0:
                bad.append((x, y, c))
    if bad:
        print("  orphans in %s: %s" % (name, bad[:8]))
    return bad


made = []

# ============================================================ characters
# 16 x 22. Front-facing, chunky heads, eyes on one row: at this size a second
# eye row reads as a scowl and these villagers are never unkind.

player = [
    "................",
    ".....######.....",
    "....#AAAAAA#....",
    "...#AABBBBBB#...",
    "...#BBBBBBBB#...",
    "..#GGGGGGGGGG#..",
    "..#IIIIIIIIII#..",
    "..#I##IIII##I#..",
    "..#ILLIIIILLI#..",
    "..#IIIIKKIIJJ#..",
    "...#IIIIIIII#...",
    "....#111111#....",
    "..#1111111133#..",
    ".#111111111333#.",
    ".#11GG11111333#.",
    ".#333333333333#.",
    ".#111111111333#.",
    ".#111111111333#.",
    "...#22#..#22#...",
    "...#22#..#22#...",
    "...#GG#..#GG#...",
    "...####..####...",
]

pim = [
    "................",
    ".....#.#.#......",
    "....#F#F#F#.....",
    "...#FEFFFFFF#...",
    "..#FEEFFFFFFG#..",
    "..#FEFFFFFFFG#..",
    "..#JFFFFFFFFJ#..",
    "..#JJJJJJJJJJ#..",
    "..#J##JJJJ##K#..",
    "..#JJJJ##JJJK#..",
    "...#JJJJJJJJ#...",
    "....#JJJJJJ#....",
    "..#FEEFFFFFFG#..",
    "..#FE444444FG#..",
    ".#FE44444444FG#.",
    ".#FF44444444FG#.",
    ".#FF44444444FG#.",
    ".#FFF444444FFG#.",
    "...#JJJJJJJJ#...",
    "...#JJ#..#JJ#...",
    "...#KK#..#KK#...",
    "...####..####...",
]

marla = [
    "................",
    "....######......",
    "...#XXXXXX#.....",
    "...#X##XXX#UUU#.",
    "...#XXXXXX#UU#..",
    "...#XXXXXX#.....",
    "....#XXXX#......",
    ".....#XX#.......",
    ".....#XX#.......",
    ".....#XO#.......",
    ".....#XO#.......",
    "....#XXOO#......",
    "..#XXXOOOOOQ#...",
    ".#XXXOOOOOOQQ#..",
    ".#XXOOOOOOOQQ#..",
    ".#XXOOOOOOOQQ#..",
    ".#XXXOOOOOOQQ#..",
    ".#XXXXOOOOOQ#...",
    "..#XXXXXXXX#....",
    "....#U#..#U#....",
    "...#UU#..#UU#...",
    "...####..####...",
]

bodkin = [
    "................",
    "....#######.....",
    "...#ZZZZZZZ#....",
    "..#ZZZZZZZZZ#...",
    "..#ZZZZZZZZZY#..",
    "..#IIIIIIIIIY#..",
    "..#IIIIIIIIII#..",
    "..#I##IIII##I#..",
    "..#IIIIIIIIIJ#..",
    "..#IIIVVVVIIJ#..",
    "...#IIVVVVII#...",
    "....#MMMMMM#....",
    "..#MMMMMMMMMN#..",
    "..#ZZZZZZZZZY#..",
    ".#ZZZZZZZZZZZY#.",
    ".#IZZZZZZZZZZI#.",
    ".#IIZZZZZZZZII#.",
    ".#IIZZZZZZZZII#.",
    "...#ZZZZZZZZ#...",
    "...#II#..#II#...",
    "...#XX#..#XX#...",
    "...####..####...",
]

for nm, rows in (("player", player), ("pim", pim), ("marla", marla), ("bodkin", bodkin)):
    orphan_report(nm, rows)
    made.append(save("char_" + nm, rows))

# =============================================================== portraits
# 20 x 24, for the conversation box. The world sprites are 16 x 22 and were
# being blown up to 48 px wide, which left Bodkin's face about ten pixels
# across and unreadable. These are drawn at the size they are shown.

port_pim = [
    "......#..#..#.......",
    ".....#F##F##F#......",
    "....#FFFFFFFFF#.....",
    "...#FEFFFFFFFFG#....",
    "..#FEEFFFFFFFFFG#...",
    "..#FEFFFFFFFFFFG#...",
    ".#JFFFFFFFFFFFFJ#...",
    ".#JJJJJJJJJJJJJJ#...",
    ".#JJJJJJJJJJJJJJ#...",
    ".#J##JJJJJJJJ##J#...",
    ".#J##JJJJJJJJ##J#...",
    ".#JJJJJJJJJJJJJJ#...",
    ".#JJJJJJKKJJJJJJ#...",
    ".#JJJJJKKKKJJJJK#...",
    ".#JJJJJJKKJJJJJK#...",
    "..#JJJJJJJJJJJK#....",
    "...#JJJJJJJJJK#.....",
    "....##########......",
    "...#444444444#......",
    "..#4444444444F#.....",
    ".#F444444444444#....",
    ".#F4444444444FG#....",
    ".#FF44444444FFG#....",
    ".###############....",
]

port_marla = [
    "....#######.........",
    "...#XXXXXXX#........",
    "..#XXXXXXXXX#.......",
    "..#XXXXXXXXX#.......",
    "..#X##XXXXXX#UU#....",
    "..#X##XXXXXX#UUU#...",
    "..#XXXXXXXXX#UUUU#..",
    "..#XXXXXXXXX#UUU#...",
    "..#XXXXXXXXX#UU#....",
    "...#XXXXXXX#........",
    "...#XXXXXXX#........",
    "....#XXXXX#.........",
    "....#XXXXX#.........",
    "....#XXXXX#.........",
    "....#XXOXX#.........",
    "....#XXOXX#.........",
    "...#XXXOOX#.........",
    "..#XXXOOOOX#........",
    ".#XXXOOOOOOQ#.......",
    "#XXXOOOOOOOQQ#......",
    "#XXOOOOOOOOQQ#......",
    "#XXOOOOOOOOQQ#......",
    "#XXXOOOOOOOQQ#......",
    ".#############......",
]

port_bodkin = [
    "....#########.......",
    "...#ZZZZZZZZZ#......",
    "..#ZZZZZZZZZZZ#.....",
    ".#ZZZZZZZZZZZZZ#....",
    ".#ZZZZZZZZZZZZZY#...",
    ".#IIIIIIIIIIIIIY#...",
    ".#IIIIIIIIIIIIII#...",
    ".#I##IIIIIIII##I#...",
    ".#I##IIIIIIII##I#...",
    ".#IIIIIIIIIIIIII#...",
    ".#IIIIIVVVVIIIIJ#...",
    ".#IIIIVVVVVVIIIJ#...",
    ".#IIIIVVVVVVIIIJ#...",
    ".#IIIIIVVVVIIIIJ#...",
    "..#IIIIIVVIIIIJ#....",
    "...#IIIIIIIIIJ#.....",
    "....##########......",
    "...#MMMMMMMMM#......",
    "..#MMMMMMMMMMN#.....",
    ".#ZMMMMMMMMMMNZ#....",
    ".#ZZZZZZZZZZZZZY#...",
    ".#IZZZZZZZZZZZIY#...",
    ".#IIZZZZZZZZZIIY#...",
    ".###############....",
]

for nm, rows in (("pim", port_pim), ("marla", port_marla), ("bodkin", port_bodkin)):
    orphan_report("port_" + nm, rows)
    made.append(save("port_" + nm, rows))

# ================================================================== items
# 12 x 12, drawn to be told apart at a glance in a crowded bag grid.

items = {}

items["moss"] = [
    "............",
    "....####....",
    "..##BBBB##..",
    ".#BAABBBAB#.",
    ".#ABBBAABB#.",
    "#BBAABBBBAB#",
    "#ABBBBAABBC#",
    "#BBAABBBCCC#",
    ".#BBBBCCCC#.",
    ".#CBCCCCCC#.",
    "..##CCCC##..",
    "....####....",
]

items["berries"] = [
    "......##....",
    ".....#BB#...",
    "....#BAB#...",
    "..###B#B##..",
    ".#LLM#MLL#..",
    "#LLLM#MMLM#.",
    "#LMMM#MMMN#.",
    "#MMMN#MNNN#.",
    ".#MNN#NNN#..",
    "..###.###...",
    "............",
    "............",
]

items["pebble"] = [
    "............",
    "............",
    "...#####....",
    "..#RRRRS#...",
    ".#RRRRRSS#..",
    "#RRRRSSSST#.",
    "#RRSSSSSTT#.",
    "#SSSSSTTTT#.",
    ".#SSTTTTT#..",
    "..#######...",
    "............",
    "............",
]

items["mushroom"] = [
    "............",
    "...#####....",
    "..#MLLLM#...",
    ".#MLXLLXM#..",
    "#MLLLXLLLM#.",
    "#MXLLLLXLM#.",
    "#NMMMMMMMN#.",
    ".##IIIIII##.",
    "...#IIJI#...",
    "...#IJJI#...",
    "...#IJJK#...",
    "...######...",
]

items["feather"] = [
    ".......###..",
    "......#XXO#.",
    ".....#XXOO#.",
    "....#XXOOO#.",
    "...#XXOOO#..",
    "..#XXOOOP#..",
    "..#XOOOP#...",
    ".#XOOOP#....",
    ".#OOPP#.....",
    "#OPP#.......",
    "#PQ#........",
    "##..........",
]

items["glassbead"] = [
    "............",
    "....####....",
    "..##WWWW##..",
    ".#WXXWWWWW#.",
    ".#XXWWWWWW#.",
    "#WXWWWWWWWW#",
    "#WWWWWWVVWW#",
    "#WWWWWVVVWW#",
    ".#WWWVVVVW#.",
    ".#WWVVVVVW#.",
    "..##WWWW##..",
    "....####....",
]

items["acorn"] = [
    "............",
    "....####....",
    "..##GGGG##..",
    ".#GFFGGGGG#.",
    ".#GGGGGGGH#.",
    "#GGGGGGGHH#.",
    ".#EEEEEEE#..",
    ".#EEJEEEF#..",
    "..#EEEEF#...",
    "..#EEEFF#...",
    "...#EFF#....",
    "....###.....",
]

items["pinecone"] = [
    ".....##.....",
    "....#GG#....",
    "...#GHGH#...",
    "..#GFGHGH#..",
    "..#FGHGHG#..",
    ".#GFGHGHGH#.",
    ".#FGHGHGHG#.",
    ".#GFGHGHGH#.",
    "..#GHGHGH#..",
    "..#FGHGHG#..",
    "...#GHGH#...",
    "....####....",
]

items["snailshell"] = [
    "............",
    "....####....",
    "..##JJJJ##..",
    ".#JIJJJJKK#.",
    ".#JIJ##JJKK#",
    "#JIJ#II#JKK#",
    "#JJ#II#JJKK#",
    "#JJ#IIIJ#KK#",
    ".#JJ###JJKK#",
    ".#JJJJJJJKK#",
    "..##JJJJK##.",
    "....####....",
]

items["reed"] = [
    "..#G#..#G#..",
    "..#GH#.#GH#.",
    "..#GH#.#GH#.",
    "..#GH#.#GH#.",
    "..#GH#.#GH#.",
    "..#B#..#B#..",
    "..#B#..#B#..",
    ".#BA#.#BA#..",
    ".#BA#.#BA#..",
    "#BAB#.#BAB#.",
    "#AB#...#AB#.",
    "##.......##.",
]

for nm, rows in items.items():
    orphan_report(nm, rows)
    made.append(save("item_" + nm, rows))

# ================================================================== props
# World objects. Wider than tall where they should feel planted.

bush = [
    "....######........",
    "..##BBBBBB##......",
    ".#BAABBBBBBB#.....",
    "#BAABBBBBBBBB##...",
    "#ABBBBBBBBBBBBB#..",
    "#BBBBBCBBBBBBBC#..",
    "#BBBCCCBBBBBCCC#..",
    ".#BCCCCCBBCCCCC#..",
    ".#CCCCCCCCCCCCC#..",
    "..#CCCDDCCCDDC#...",
    "...#CDDDDDDDD#....",
    "....##DDDDD##.....",
    "......#####.......",
    "..................",
]

bush_berries = [
    "....######........",
    "..##BBBBBB##......",
    ".#BAABBMBBBB#.....",
    "#BAABBMMBBBBB##...",
    "#ABBBBBBBBMMBBB#..",
    "#BBMMBCBBBMMBBBC#.",
    "#BBMMCCCBBBBBCCC#.",
    ".#BCCCCCBBCCCCC#..",
    ".#CCCCMMCCCCMMC#..",
    "..#CCCMMCCCMMDC#..",
    "...#CDDDDDDDD#....",
    "....##DDDDD##.....",
    "......#####.......",
    "..................",
]

mossrock = [
    "......######......",
    "....##RRRRRR##....",
    "..##RRRRRRRRSS##..",
    ".#RRRRRSSSSSSSTT#.",
    "#RRBBBSSSSSBBSTT#.",
    "#RBBABBSSSBBABBT#.",
    "#SBBBBSSSSSBBBTT#.",
    "#SSSSSSSSTTTTTTT#.",
    ".#SSSTTTTTTTTTT#..",
    "..###TTTTTTTT###..",
    "....##########....",
    "..................",
]

stump = [
    "..#########...",
    ".#EEEEEEEEE#..",
    "#EEJJJJJEEEF#.",
    "#EJJEEEJJEEF#.",
    "#EJEJJJEJEEF#.",
    "#EJJEEEJJEFF#.",
    "#EEJJJJJEEFF#.",
    "#FEEEEEEEEFG#.",
    "#GFGFFFGFFGG#.",
    "#GFGFFGFGFGG#.",
    ".#GGGGGGGGH#..",
    "..#########...",
]

reeds = [
    "......##........",
    ".....#BA#..##...",
    "..##.#BAB#.#B#..",
    ".#BA##BAB##BA#..",
    ".#BAB#BAB#BBA#..",
    ".#BAB#BCB#BBA#..",
    ".#BCB#BCB#BCB#..",
    ".#BCB#BCB#BCB#..",
    ".#BCB#CCB#BCB#..",
    "..#CB#CCB#CC#...",
    "..#CC#CC#.#CC#..",
    "..#CC#CC#.#CC#..",
    "...#C#DC#..#C#..",
    "...#D#DD#..#D#..",
    "...###DD####....",
    ".....######.....",
]

tree = [
    "........######........",
    "......##BBBBBB##......",
    "....##BAABBBBBBB##....",
    "..##BAABBBBBBBBBBB##..",
    ".#BAABBBBBBBBBBBBBBB#.",
    "#BAABBBBBBBBBBBBBBCC#.",
    "#ABBBBBBBBBBBBBBBCCC#.",
    "#BBBBBBBBBBBBBBBCCCC#.",
    "#BBBBBCCBBBBBBCCCCCC#.",
    "#BBBCCCCBBBBCCCCCCCC#.",
    ".#BCCCCCCBCCCCCCCCC#..",
    ".#CCCCCCCCCCCCCCCCC#..",
    "..#CCCCCCCCCCCCCCC#...",
    "..#CCCCDDCCCCDDCCC#...",
    "...#CDDDDDDDDDDDC#....",
    "....##DDDDDDDDD##.....",
    "......#DDDDDDD#.......",
    ".......###..##........",
    ".........#EF#.........",
    ".........#EF#.........",
    ".........#EF#.........",
    ".........#EFG#........",
    "........#EEFG#........",
    "........#EFFG#........",
    "........#EFFG#........",
    ".......#EEFFGG#.......",
    ".......#EFFFGG#.......",
    "......#EEFFFGGG#......",
    ".....#EEFFFFGGGG#.....",
    "....##EFFFFFGGGG##....",
    "...#GGGGGGGGGGGGGG#...",
    "...################...",
]

well = [
    "........######........",
    "......##EEEEEE##......",
    "....##EEEEEEEEEE##....",
    "..##EEEEEEEEEEEEEE##..",
    "##FFFFFFFFFFFFFFFFFF##",
    "######################",
    "...#G#..........#G#...",
    "...#G#...####...#G#...",
    "...#G#..#QQQQ#..#G#...",
    "...#G#..#QQQQ#..#G#...",
    "...#G#...####...#G#...",
    "...#G#..........#G#...",
    "...#G#..........#G#...",
    ".####################.",
    "#RRRRRRRRRRRRRRRRRRRR#",
    "#RRR##############RRR#",
    "#RR#TTTTTTTTTTTTTT#RS#",
    "#RR#TQQQQQQQQQQQQT#SS#",
    "#RS#TQQQQQQQQQQQQT#SS#",
    "#RS#TTTTTTTTTTTTTT#SS#",
    "#SS################SS#",
    "#SSSSSSSSSSSSSSSSSSTT#",
    "#SSSSSSSSSSSSSSSSSTTT#",
    ".####################.",
]

house = [
    "..........####..........",
    ".........#MMMM#.........",
    "........#MMMMMM#........",
    ".......#MMMMMMMM#.......",
    "......#MMMMMMMMMM#......",
    ".....#MMLLMMMMMMMM#.....",
    "....#MMLLMMMMMMMMNN#....",
    "...#MMLMMMMMMMMMMNNN#...",
    "..#MMMMMMMMMMMMMMMNNN#..",
    ".#MMMMMMMMMMMMMMMMMNNN#.",
    "#MMMMMMMMMMMMMMMMMMNNNN#",
    "#NNNNNNNNNNNNNNNNNNNNNN#",
    "#EEEEEEEEEEEEEEEEEEEEFF#",
    "#EEE####EEEEEE####EEEFF#",
    "#EEE#OO#EEEEEE#OO#EEEFF#",
    "#EEE#OO#EEEEEE#OO#EEEFF#",
    "#EEE####EE##EE####EEEFF#",
    "#EEEEEEEE#GG#EEEEEEEEFF#",
    "#FEEEEEEE#GG#EEEEEEEFFG#",
    "#FFEEEEEE#GU#EEEEEEFFGG#",
    "#FFFFFFFF#GG#FFFFFFFGGG#",
    "#GGGGGGGG#GG#GGGGGGGGGG#",
    "########################",
    "........................",
]

signpost = [
    "..............",
    "...########...",
    "..#EEEEEEEE#..",
    "..#EJJEEJJE#..",
    "..#EEEEEEEF#..",
    "..#EJJJEEEF#..",
    "..#EEEEEEFF#..",
    "...########...",
    "......##......",
    ".....#FG#.....",
    ".....#FG#.....",
    ".....#FG#.....",
    ".....#FG#.....",
    "....##FG##....",
    "....######....",
]

bench = [
    "..................",
    ".################.",
    "#EEEEEEEEEEEEEEEE#",
    "#FFFFFFFFFFFFFFFF#",
    ".##############G#.",
    "..#G#........#G#..",
    ".################.",
    "#EEEEEEEEEEEEEEEE#",
    "#FFFFFFFFFFFFFFFF#",
    ".#GG#......#GG#G#.",
    ".#GG#......#GG#...",
    ".#HH#......#HH#...",
    ".####......####...",
    "..................",
]

lantern = [
    "....####....",
    "...#GHHG#...",
    "..##EFFE##..",
    ".#UUUUUUUU#.",
    "#UXXUUUUXU#.",
    "#UXXUUUUUU#.",
    "#UUUUUUUUU#.",
    ".#UUUUUUU#..",
    "..##EFFE##..",
    "...#GFFG#...",
    "...#GFFG#...",
    "...#GFFG#...",
    "...#GFFG#...",
    "..#GFFGG#...",
    "..#GGFGG#...",
    ".##GGGGG##..",
    ".#########..",
]

flowerbed = [
    "...##....##.......",
    "..#VU#..#UV#..##..",
    ".#VVVU##UVVV##VW#.",
    ".#VUVUBBUVUV#WVW#.",
    "..#VU#BB#UV#.#WV#.",
    "...#B##BB##B##BB#.",
    "..#BABBBABBBABBB#.",
    ".#BAABBBBAABBBBAB#",
    "#BABBBCBBBBCBBBBB#",
    "#BBBCCCBBBCCCBBBC#",
    ".#CCCCCCCCCCCCCC#.",
    "..#GGGGGGGGGGGG#..",
    "..#HHHHHHHHHHHH#..",
    "...############...",
]

bridge = [
    "......................",
    "..####....####....####",
    ".#RRRR#..#RRRR#..#RRR#",
    "#RRRRSS##RRRRSS##RRRSS",
    "#RRSSSS##RRSSSS##RRSSS",
    "#SSSSTT##SSSSTT##SSSTT",
    ".#SSTT#..#SSTT#..#SSTT",
    "..####....####....####",
    "......................",
]

props = {
    "bush": bush, "bush_berries": bush_berries, "mossrock": mossrock,
    "stump": stump, "reeds": reeds, "tree": tree, "well": well,
    "house": house, "signpost": signpost,
    "bench": bench, "lantern": lantern, "flowerbed": flowerbed, "bridge": bridge,
}
for nm, rows in props.items():
    orphan_report(nm, rows)
    made.append(save("prop_" + nm, rows))

print("wrote %d sprites to assets/" % len(made))
for nm, w, h in made:
    print("  %-20s %2dx%-2d" % (nm, w, h))
