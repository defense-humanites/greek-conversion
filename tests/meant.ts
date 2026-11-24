/**
 * The changes of output that are meant (`differential.ts`), until the
 * reference moves to the release that makes them, when the list is emptied
 * (RELEASING.md). `scripts/differential_changes.ts` lists the inputs that
 * change and that the list does not have yet.
 */

/**
 * A change of output that is meant: the input, and, where it changes under
 * some options or calls only, their label and the call, as a difference
 * reports them, with the reason. Without an input, the change is meant for
 * every input under its options and call: the change of an option, which
 * every input it acts on shows.
 */
export interface MeantChange {
  input?: string;
  label?: string;
  call?: string;
  reason: string;
}

const MARKS_AFTER_UNKNOWN =
  "A mark the readers do not know no longer keeps from their letter the marks that canonical order put after it.";
const LATIN_LETTERS =
  "A Latin letter is written in Beta Code in the case of its letters, as it reads back.";
const SIGMA_CIRCUMFLEX =
  "A circumflex on a sigma, stigma, or sampi is written as a tilde where the circumflex is U+0302, as it reads back.";
const CAPITAL_SIGNS =
  "A capital sign alone between words in capitals is read in capitals; the losses of an output in capitals change.";
const BNF_KERAIA =
  "BnF writes a keraia as ʹ after anything but a letter without an accent, where an acute would not read back as one.";
const MIDDLE_DOT =
  "A middle dot, a literal in transliteration and Beta Code, is reported lost in Greek output, which reads it as the ano teleia.";
const DETAILED_TO_GREEK = "convertDetailed(transliteration → greek)";
const ISO_APOSTROPHE =
  "Under ISO 843, the apostrophe of a smooth breathing or a coronis reads back as the mark, which convertDetailed() no longer reports lost.";
const ISO_HIATUS =
  "Under ISO 843, the apostrophe of a smooth breathing reads back on the first vowel of a pair whose hiatus `y` marks, as `h` does: no diaeresis is written.";
const SOURCE_APOSTROPHE =
  "An apostrophe of the source where ISO 843 writes a smooth breathing or a coronis is written U+02BC, which reads back as an apostrophe.";
const MONOTONIC_EVERY_FORMAT =
  "Monotonic accentuation applies to Beta Code and transliteration, which spell the monotonic text that Greek output writes.";

/** The sets of options that write or read ISO 843, as a difference names them. */
const ISO_LABELS = [
  "iso-843-type-1",
  "iso-843-type-2",
  "source",
  'random 8: {"preset":"iso-843-type-1","transliteration":{"nasalGamma":"nasal-medial-kappa","upsilon":"u"},"diacritics":{"overline":"preserve"},"source":{"preset":"iso-843-type-2"}}',
];

/** The changes of output that are meant. */
export const MEANT: readonly MeantChange[] = [
  {
    input: "ἀ\u0323ν ἀ\u0307ν ὑ\u20DD ἄ\u0350 ạ\u0313n",
    reason: MARKS_AFTER_UNKNOWN,
  },
  { input: "ϙἙ;Ω\u0323\u0305 ϟΨ  \u20DD", reason: MARKS_AFTER_UNKNOWN },
  { input: "κ[ Βϡ\u0323\u0306ϕὙμ\u0308Τa", reason: MARKS_AFTER_UNKNOWN },
  { input: "ΠΩ\u0323\u0307[ȣ\u0305Νϳ μ", reason: MARKS_AFTER_UNKNOWN },
  { input: "ἄ\u0313ΦΟ\u0313]ὅϜρ\u0323\u03049", reason: MARKS_AFTER_UNKNOWN },
  { input: "\u0307ΜϘ1;ὅ\u0323[\u0307Π", reason: MARKS_AFTER_UNKNOWN },
  {
    input: "\u200Cξ\u0308\u0313\u0307\u0323χʹΓ\u20DDΝʹ",
    reason: MARKS_AFTER_UNKNOWN,
  },
  {
    input: "\u0300ϐχ\u0323\u0306ʹΔ\u0342\u03061\u03052Ϛ",
    reason: MARKS_AFTER_UNKNOWN,
  },
  {
    input: "a\u0323\u0313n a)\u0307n u(\u20DD a)/\u0350 a\u0323\u0313n",
    reason: MARKS_AFTER_UNKNOWN,
  },
  {
    input: "ạ\u0313n ȧn hy\u20DD á\u0350 ạ\u0313n",
    reason: MARKS_AFTER_UNKNOWN,
  },
  {
    input:
      "῾Ρωμαῖοι, «ΟΥ\u0313ΚΟΥ\u0342Ν» — ἀΐδιος; 1 ξʹ ʹ ἄ\u0301 abc 漢字 \u200C",
    label: "bnf-core",
    reason: BNF_KERAIA,
  },
  {
    input:
      "῾Ρωμαῖοι, «ΟΥ\u0313ΚΟΥ\u0342Ν» — ἀΐδιος; 1 ξʹ ʹ ἄ\u0301 abc 漢字 \u200C",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "\u20DDʹʹΘκ", label: "bnf-core", reason: BNF_KERAIA },
  { input: "7ʹϘεϠΦ", label: "bnf-core", reason: BNF_KERAIA },
  { input: ";έ0\u0300ʹ\n\u0304Χ", label: "bnf-core", reason: BNF_KERAIA },
  { input: "\u2009ʹʹΩ1漢ΕΤ\u0306", label: "bnf-core", reason: BNF_KERAIA },
  { input: "ʹ; \u0307\u0314\u20DDώ", label: "bnf-core", reason: BNF_KERAIA },
  {
    input: "΅\u200C\u0301\u0345ύΣ(ʹ ῾῎\u0307Ε",
    label: "bnf-core",
    reason: BNF_KERAIA,
  },
  {
    input: "ʹ\u0313ζΜ,ς\u0313\u0304Ϛ\u0342\u00A0ʼ,η",
    label: "bnf-core",
    reason: BNF_KERAIA,
  },
  { input: "ΛόʹϘ·\u0345σ\u0306ΡΠ.π", label: "bnf-core", reason: BNF_KERAIA },
  { input: "ότaω7Σ", label: "tlg-core", reason: LATIN_LETTERS },
  {
    input: "\u0307\u0307\u00A0\u00A0’a",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  {
    input: "\u2009’\u20DD᾽υ͵ϕ\u0304Ϛa—φ5\u0323",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "ΔΡ᾿[Ξ;῍a\u0300ήάθΞϰ", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "ΑΕ\u0313a\u0306ϵ37;ίή", label: "tlg-core", reason: LATIN_LETTERS },
  {
    input: "ξ\u0313οϘ΅\u0307ϲ\u20DDa»",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "\u0345ʼΑ\u0313\u0304a", label: "tlg-core", reason: LATIN_LETTERS },
  {
    input: "a0ϝϠάω\u2009·漢σ΅\u20DD\u0305\u0323",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  {
    input: "Ϝϑθʹτ]1\u0307Μ\u0305a῎ξ",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  {
    input: "\nϰ\u0313\u0305\u0304a\u0305",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "ϡ'ζaΘ", label: "tlg-core", reason: LATIN_LETTERS },
  {
    input:
      "*(rwmai=oi, «*o*)u*k*o*=u*n» _ a)i+/dios; 1 c# # a)/ abc 漢字 \u200C",
    label: "bnf-core",
    reason: BNF_KERAIA,
  },
  { input: "2n79#^<5[8#)", label: "bnf-core", reason: BNF_KERAIA },
  { input: "#f2a5{", label: "bnf-core", reason: BNF_KERAIA },
  { input: "+\\23<a 'lh[#u[", label: "bnf-core", reason: BNF_KERAIA },
  { input: ")#+\\2jg*r", label: "bnf-core", reason: BNF_KERAIA },
  { input: "]b.kp,&)#h", label: "bnf-core", reason: BNF_KERAIA },
  { input: "\\;6)=}153##", label: "bnf-core", reason: BNF_KERAIA },
  { input: "x6=+pj/#{7^'", label: "bnf-core", reason: BNF_KERAIA },
  { input: "sc'#<5", label: "bnf-core", reason: BNF_KERAIA },
  { input: "+=00@*##y52/", label: "bnf-core", reason: BNF_KERAIA },
  { input: "^%:=+[3&#@", label: "bnf-core", reason: BNF_KERAIA },
  { input: "# 6u25>9", label: "bnf-core", reason: BNF_KERAIA },
  { input: "#^^g", label: "bnf-core", reason: BNF_KERAIA },
  { input: "â\u0308ŭZH\u0313(ù\u0304ibûi'", reason: LATIN_LETTERS },
  { input: "liüiGnMʹò0H3T", reason: LATIN_LETTERS },
  { input: "\u0308\u0300âGZ\u0300῾HH\u0342·zt", reason: LATIN_LETTERS },
  { input: "ĭ῾H", reason: LATIN_LETTERS },
  {
    input: "Rhōmaĩoi, «OUKOŨN» — aḯdios? 1 xʹ ʹ á abc 漢字 \u200C",
    label: "bnf-core",
    reason: BNF_KERAIA,
  },
  {
    input: "Rhōmaĩoi, «OUKOŨN» — aḯdios? 1 xʹ ʹ á abc 漢字 \u200C",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "ʹ", label: "bnf-core", reason: BNF_KERAIA },
  { input: "KGŌD2ʹkāò\u0304", label: "bnf-core", reason: BNF_KERAIA },
  {
    input: "\u0300.\u0301vʹI9ē8\u0300ă",
    label: "bnf-core",
    reason: BNF_KERAIA,
  },
  {
    input: "\u0300.\u0301vʹI9ē8\u0300ă",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "ʹôáō\u0308'", label: "bnf-core", reason: BNF_KERAIA },
  {
    input: "\u0308ïìnʹùóTâm\u0306h\u0301",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "tOfī\u0342", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "v\u03056ī\u0342BāU", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "Gh\u0303h-N", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "c\u0308\u0303", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "\u0305īS M9h\u0304ēó", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "cóRt\u03421 ăk0ōʹ", label: "tlg-core", reason: LATIN_LETTERS },
  {
    input: "\u0304clxüǘ᾿\u0342ō5úòz",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "vwûdDāü\u0301v\u0303d", label: "tlg-core", reason: LATIN_LETTERS },
  {
    input: "’P\u0301ìŌs\u030656h;,\u0313ǖ",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "hpo\u0306ï\u0313Uû", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "῾(vo῾āʹK\u0342\u0304w", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "í1èì\u0305sc\u0314Ro’", label: "tlg-core", reason: LATIN_LETTERS },
  {
    input: "káhD\u0305Tû\u0345e\u0304",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "Ēf", label: "tlg-core", reason: LATIN_LETTERS },
  {
    input: ";hfhw\u0314\u0300pX756ĭT",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "ùc", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "O(᾿Uǖ\u0306nĭ(h", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "9vū-c\u0345", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "û\u0303phwh\u0305", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "x\u0308ddùŌôf,'ìbf", label: "tlg-core", reason: LATIN_LETTERS },
  {
    input: "uHǖü\u0308ûD\u0308fu᾿h0M",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  {
    input: "\u0303.9cĭi7\u0313àē,àA",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: ".N)wsūkē0(c\u0303", label: "tlg-core", reason: LATIN_LETTERS },
  {
    input: "\u0314Yï\u0303RP\u0305efǘ᾿",
    label: "tlg-core",
    reason: LATIN_LETTERS,
  },
  { input: "0ca3ī·ô\u0300xă\u0342", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "á᾿\u0303f\u0308", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "\u0303K\u0305āh", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "TT'XĒ’.Xvn\u0345ă", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "\u0314û᾿\u0304xvPí", label: "tlg-core", reason: LATIN_LETTERS },
  { input: "\u0308Ϡ\u0342ϟ0Ὑ;π", reason: SIGMA_CIRCUMFLEX },
  {
    input: "ʹ\u0313ζΜ,ς\u0313\u0304Ϛ\u0342\u00A0ʼ,η",
    reason: SIGMA_CIRCUMFLEX,
  },
  { input: "(12xs=@,'v", reason: SIGMA_CIRCUMFLEX },
  { input: "ὅ⸒τι\u2009ϗ ὁ", reason: CAPITAL_SIGNS },
  { input: "σϟ2, ϗ\u0305", reason: CAPITAL_SIGNS },
  {
    input:
      "ϗ νῦν ϗ ἀεὶ ϗ εἰς τοὺς αἰῶνας τῶν αἰώνων· ἐν τῷ ὀνόματι τοῦ κ\u0305υ\u0305 ι\u0305υ\u0305 χ\u0305υ\u0305",
    reason: CAPITAL_SIGNS,
  },
  { input: "ϗ\u0313 τοῦ ϗ\u0313γώ", reason: CAPITAL_SIGNS },
  { input: "ϗ νῦν ϗ ἀεὶ ϗ εἰς τοὺς αἰῶνας τῶν αἰώνων", reason: CAPITAL_SIGNS },
  { input: "ϗ ȣ\u0313κ ἔϛιν ἄλλος πλὴν αὐτȣ\u0342", reason: CAPITAL_SIGNS },
  { input: "ϊσϞ\u20092͵ϟόȣ\u00A0\u0342\nἙϘ", reason: CAPITAL_SIGNS },
  { input: "ȣ9ΝϜϐΥα6\u0306Λ ᾿", reason: CAPITAL_SIGNS },
  { input: "δῤΧϗ", reason: CAPITAL_SIGNS },
  { input: "όὅΗ;Ϛτϗ\u00A0 Ὑ", reason: CAPITAL_SIGNS },
  { input: "ϲΞȣ1\u20DDς\u0307\u0304ϐ", reason: CAPITAL_SIGNS },
  { input: "o(/#532ti\u2009#1532 o(", reason: CAPITAL_SIGNS },
  {
    input:
      "#1532 nu=n #1532 a)ei\\ #1532 ei)s tou\\s ai)w=nas tw=n ai)w/nwn: e)n tw=| o)no/mati tou= <ku> <iu> <xu>",
    reason: CAPITAL_SIGNS,
  },
  { input: "#1532) tou= #1532)gw/", reason: CAPITAL_SIGNS },
  { input: "#1532 tou= *#1531 #1521)tos", reason: CAPITAL_SIGNS },
  { input: "#1532) a)nh/r", reason: CAPITAL_SIGNS },
  { input: "\u0300 '1·ē", call: DETAILED_TO_GREEK, reason: MIDDLE_DOT },
  { input: "nP Xm·;Ō;Xī\u0300)", call: DETAILED_TO_GREEK, reason: MIDDLE_DOT },
  { input: "GK;T\u0308·ĒùGyúâD", call: DETAILED_TO_GREEK, reason: MIDDLE_DOT },
  { input: "·3", call: DETAILED_TO_GREEK, reason: MIDDLE_DOT },
  {
    input: "\u0313éz·BúG\u0300\u0300Tàu'a",
    call: DETAILED_TO_GREEK,
    reason: MIDDLE_DOT,
  },
  { input: "· )NT", call: DETAILED_TO_GREEK, reason: MIDDLE_DOT },
  { input: "gY·M\u0313\u03426pn", call: DETAILED_TO_GREEK, reason: MIDDLE_DOT },
  {
    input: "0ca3ī·ô\u0300xă\u0342",
    call: DETAILED_TO_GREEK,
    reason: MIDDLE_DOT,
  },
  ...isoInputs(SOURCE_APOSTROPHE, [
    "+0h||'hd",
    "7/0r#('in1b",
    "m=l''o",
    "\u0307Χ\u0308Ω\u1FBFζ",
    "\u0345\u02BCΑ\u0313\u0304a",
    "\u2009’\u20DD\u1FBDυ͵ϕ\u0304Ϛa—φ5\u0323",
    "x\u0308ddùŌôf,'ìbf",
    "ôòe'éò1\u0314ĭ3Ē",
    "\u0313éz·BúG\u0300\u0300Tàu'a",
    "\u0307\u0307\u00A0\u00A0’a",
  ]),
  ...isoInputs(ISO_HIATUS, [
    "ἀυτμή",
    "ἀυτμή, (1)",
    "a)utmh/",
    "a)utmh/, (1]1",
  ]),
  ...isoApostropheChanges(),
  ...monotonicCalls().map((call) => ({
    label: "monotonic, decomposed",
    call,
    reason: MONOTONIC_EVERY_FORMAT,
  })),
];

/** Changes of these inputs, under the sets of options of ISO 843 only. */
function isoInputs(reason: string, inputs: readonly string[]): MeantChange[] {
  return inputs.flatMap((input) =>
    ISO_LABELS.map((label) => ({ input, label, reason }))
  );
}

/**
 * The losses that convertDetailed() into ISO 843 no longer reports, under
 * the sets of options that write the smooth breathing and the coronis as an
 * apostrophe, as a difference names them.
 */
function isoApostropheChanges(): MeantChange[] {
  const changes: MeantChange[] = [];
  for (const label of ISO_LABELS) {
    for (const from of ["greek", "beta-code", "transliteration"]) {
      for (
        const call of ["convertDetailed", "createConverter().convertDetailed"]
      ) {
        changes.push({
          label,
          call: `${call}(${from} → transliteration)`,
          reason: ISO_APOSTROPHE,
        });
      }
    }
  }
  return changes;
}

/**
 * The calls that write Beta Code or transliteration, as a difference names
 * them: under monotonic accentuation, every input with a mark it removes
 * changes there.
 */
function monotonicCalls(): string[] {
  const calls: string[] = [];
  for (const to of ["beta-code", "transliteration"]) {
    for (const from of ["greek", "beta-code", "transliteration"]) {
      for (const call of ["convert", "convertDetailed", "core convert"]) {
        calls.push(`${call}(${from} → ${to})`);
      }
    }
    calls.push(`reencode(${to})`);
  }
  return calls;
}
