/*
 * Sample bracket data for the local dev harness (not shipped to users).
 * Shapes a FIFA World Cup 2026-style knockout bracket using the card's neutral
 * `rounds` model, with a mix of finished / live / scheduled / TBD matches so all
 * visual states can be checked without a running Home Assistant.
 *
 * Exposes window.WC_SAMPLE (loaded as a classic script before the card).
 */
(function () {
  const ESPN = (abbr) =>
    "https://a.espncdn.com/i/teamlogos/countries/500/" + abbr + ".png";

  const tbd = (label) => ({ name: label, short: label });
  const team = (name, abbr) => ({ name, short: abbr, logo: ESPN(abbr) });

  // Build a round of N placeholder matches with given slot labels.
  const placeholderRound = (id, name, pairs) => ({
    id,
    name,
    matches: pairs.map(([x, y], i) => ({ sideA: tbd(x), sideB: tbd(y), state: "pre", date: "2026-07-0" + ((i % 9) + 1) + "T19:00Z" })),
  });

  const roundOf32 = {
    id: "round-of-32",
    name: "Round of 32",
    matches: [
      {
        sideA: { ...team("Spain", "esp"), score: 2, winner: true },
        sideB: { ...team("Cape Verde", "cpv"), score: 0 },
        state: "post",
        statusDetail: "FT",
        date: "2026-06-28T19:00Z",
      },
      {
        sideA: { ...team("Argentina", "arg"), score: 1 },
        sideB: { ...team("Algeria", "alg"), score: 1 },
        state: "live",
        statusDetail: "HT",
        date: "2026-06-28T22:00Z",
      },
      {
        sideA: team("Brazil", "bra"),
        sideB: team("Morocco", "mar"),
        state: "pre",
        date: "2026-06-29T19:00Z",
      },
      ...[
        ["1C", "3rd D/E/F"],
        ["1E", "3rd A/B/C/D"],
        ["1F", "2H"],
        ["1D", "3rd B/E/F/I"],
        ["1G", "2A"],
        ["1A", "2B"],
        ["1H", "2J"],
        ["1B", "3rd E/H/I/J"],
        ["1I", "2L"],
        ["1K", "3rd D/E/I/J/L"],
        ["1J", "2K"],
        ["1L", "2G"],
        ["2C", "2D"],
      ].map(([x, y], i) => ({ sideA: tbd(x), sideB: tbd(y), state: "pre", date: "2026-06-2" + ((i % 3) + 7) + "T19:00Z" })),
    ],
  };

  const roundOf16 = placeholderRound("round-of-16", "Round of 16", [
    ["W R32-1", "W R32-2"],
    ["W R32-3", "W R32-4"],
    ["W R32-5", "W R32-6"],
    ["W R32-7", "W R32-8"],
    ["W R32-9", "W R32-10"],
    ["W R32-11", "W R32-12"],
    ["W R32-13", "W R32-14"],
    ["W R32-15", "W R32-16"],
  ]);

  const quarterfinals = placeholderRound("quarterfinals", "Quarterfinals", [
    ["W R16-1", "W R16-2"],
    ["W R16-3", "W R16-4"],
    ["W R16-5", "W R16-6"],
    ["W R16-7", "W R16-8"],
  ]);

  const semifinals = placeholderRound("semifinals", "Semifinals", [
    ["W QF-1", "W QF-2"],
    ["W QF-3", "W QF-4"],
  ]);

  const final = placeholderRound("final", "Final", [["W SF-1", "W SF-2"]]);

  const thirdPlace = placeholderRound("3rd-place-match", "Third Place", [["L SF-1", "L SF-2"]]);

  window.WC_SAMPLE = [
    roundOf32,
    roundOf16,
    quarterfinals,
    semifinals,
    final,
    thirdPlace,
  ];
})();
