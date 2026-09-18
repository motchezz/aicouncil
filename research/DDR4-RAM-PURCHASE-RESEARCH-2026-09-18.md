# DDR4 64GB upgrade — Jordan vs eBay purchase research (2026-09-18)

Method: four parallel research agents (eBay/global pricing, Jordan local market, platform
compatibility, machine-spec lookup). WebSearch + WebFetch. Exchange rate 1 JOD = 1.41 USD
(hard peg, CBJ 17 Sep 2026: 1 USD = 0.708 JOD).

Buyer: Amman, Jordan. Currently 2 x 8GB DDR4-2666 Kingston. Target 64GB.

---

## Verification caveat — read first

The research environment's egress proxy blocked, by policy, **every** eBay domain and **every**
Jordanian retail domain. Blocked: `ebay.com`, `jo.opensooq.com`, `gts.jo`, `gds.jo`,
`citycenter.jo`, `compujordan.com`, `igeekjo.com`, `noon.com`, plus `tomshardware.com`,
`newegg.com`, `pcpartpicker.com`, `trendforce.com`, `reddit.com`.

Consequence: **no eBay page and no Jordanian shop page was read directly.** Prices below came
from search-engine summaries of those pages. They are real strings that appeared on those sites,
but currency, stock status and SKU variant are unconfirmed. No sold/completed eBay listing data
was obtainable at all.

Treat every price here as a **lead to verify**, not a quote. The macro DRAM market data and the
compatibility guidance are independently sourced and stand on their own.

---

## 1. Market context — this dominates the decision

September 2026 is a historically bad time to buy DDR4. AI/HBM demand has starved standard DRAM
capacity; DDR4 is end-of-life at Samsung, SK Hynix and Micron.

| DDR4 8Gb 3200 spot | Price | Source |
|---|---|---|
| Nov 2025 | $12.18 | Tom's Hardware tracker |
| Aug 2026 | $42.50 | same |
| 15 Sep 2026 | $45.54 (+0.47% w/w) | TrendForce |

Roughly **+274% in ten months, but only +0.47% in the last week.** The curve has gone flat at the
peak. TrendForce's 16 Sep 2026 update reports branded DDR4 2Gx8 correcting downward, consumer
demand sluggish, suppliers loosening quotes.

Structural points that matter:

- DDR4 spot has traded as much as **172% above contract**, and in some configurations **DDR4 now
  costs more than DDR5** — the value hierarchy has inverted, because DDR4 is EOL and DDR5 is not.
- Retail (~$8/GB) is still far below what spot die cost (~$45/GB) implies. Retail is selling
  through older contract-priced inventory, so retail has further upside if spot holds.
- Genuine supply relief estimates cluster around **2028**.

**Verdict: plateaued at an extreme level, first hints of softening, not safe to wait out.**
Buy to need now. Do not plan "32GB now, 32GB later" — that is the worst possible strategy in this
market, on price and on matching.

For scale: a 2x32GB Corsair LPX DDR4-3200 kit sold for $103 shipped in Aug 2024. The same kit is
now ~$400+.

---

## 2. The blocker — 32GB DIMM support is unknown

**Nothing can be finalised until the motherboard is identified.** The vault was searched; it does
not record it.

What the vault *does* record, from `ULTRON-DESKTOP-PLAN-v1.md` (probed 2026-08-20):

- System RAM: **15.9 GB total** (consistent with the 2 x 8GB)
- **12 logical cores** (core count only, no CPU model)
- GPU: **RTX 2070**
- Windows, Node v24.15.0, Python 3.14.3

Searches for `motherboard`, `Ryzen`, `DIMM`, `Kingston`, `DDR4` across the whole vault returned
zero real hits. The vault names two machines, "Mojave PC" (primary) and "Office PC", and the one
hardware probe on file is not attributed to either.

An RTX 2070 plus DDR4-2666 plus 12 logical cores points to a **2018-2020 mainstream desktop**,
consistent with a 6C/12T part. That is pattern-matching, not evidence. It matters enormously,
because several platforms of exactly that era **cannot use 32GB DIMMs at all**.

### Platforms where 4 x 16GB is the only path to 64GB

A 32GB non-ECC UDIMM uses 16Gbit die. Controllers and BIOS code predating 16Gbit die cannot
address them — the stick is undetected, halved, or the board won't post.

| Platform | Chipsets / CPUs | Limit |
|---|---|---|
| Skylake (6th gen) | H110, B150, H170, Z170 | 16GB/DIMM. **H110 = 32GB total, 64GB impossible** |
| Kaby Lake (7th gen) | B250, H270, Z270 | 16GB/DIMM |
| Broadwell-E / Haswell-E | X99 | no 32GB non-ECC UDIMM support |
| Ryzen 1000 / 2000 (Zen, Zen+) | A320, B350, X370 | officially 64GB max = 16GB/DIMM |
| Raven Ridge / Picasso APUs | 2200G, 2400G, 3200G, 3400G | 16GB/DIMM (Picasso is Zen+ silicon) |
| Coffee Lake (8th/9th gen) | H310, B360, Z370, Z390 | **hit and miss** — BIOS-dependent, check QVL |

Supported: Comet Lake (400-series), Rocket Lake (500-series), Ryzen 3000/5000, Renoir/Cezanne.

### The four commands that settle it

Run on the target PC, Windows PowerShell:

```powershell
Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product,Version
Get-CimInstance Win32_PhysicalMemory | Select-Object BankLabel,DeviceLocator,
  @{N='GB';E={$_.Capacity/1GB}},@{N='RatedMTs';E={$_.Speed}},
  @{N='RunningMTs';E={$_.ConfiguredClockSpeed}},Manufacturer,PartNumber | Format-Table -AutoSize
Get-CimInstance Win32_PhysicalMemoryArray | Select-Object MemoryDevices,
  @{N='MaxCapacityGB';E={$_.MaxCapacity/1MB}}
Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors
```

Faster GUI route: `Win+R` → `msinfo32` → read **BaseBoard Product**. Task Manager → Performance →
Memory shows "Slots used: 2 of 4".

Linux: `sudo dmidecode -t 16` (slot count + max capacity) and `sudo dmidecode -t 17` (per-DIMM
size, speed, **Rank**, part number).

Decoding: `SMBIOSMemoryType` 26 = DDR4. `FormFactor` 8 = desktop DIMM, 12 = SODIMM.
`MemoryDevices` = physical slot count. **`MaxCapacity` from WMI is frequently wrong on consumer
boards** — once the board model is known, the vendor QVL page is the authority.

Then confirm against all four of: board QVL (any 32GB entry?), BIOS changelog ("Support 32GB
memory module"), CPU "Max Memory Size" on ark.intel.com or amd.com, and the board's published max.
**Update the BIOS before the RAM arrives**, not after.

---

## 3. Route comparison for 64GB

| Route | JOD | USD | Confidence |
|---|---|---|---|
| OpenSooq used, 4 x 16GB | 120-180 | $169-254 | prices seen, condition unverified |
| OpenSooq, 2 x 32GB Kingston Fury | ~200 | ~$282 | single listing |
| **Gardens St retail, 2 x 32GB @ ~129 ea** | **~258** | **~$364** | plausible vs world spot |
| eBay used 4 x 16GB, landed | ~252-291 | $355-410 | rules verified, prices estimated |
| Gardens St retail, 4 x 16GB @ ~99 ea | ~396 | ~$559 | plausible vs world spot |
| eBay new 2 x 32GB, landed | ~372-411 | $525-580 | rules verified, prices estimated |
| Retail listings at 69-75 JOD/32GB | ~140-150 | $197-212 | **likely stale / flagged out of stock** |

**Import is not attractive.** The landed multiplier (~1.33x best case, ~1.51x if GST stacks)
roughly cancels any US price advantage, on US prices that are themselves at record highs. Local
2x32GB at ~258 JOD beats imported new 2x32GB at ~$525-580 outright, and matches imported *used*
4x16GB while carrying returns, warranty and zero counterfeit exposure.

### Local Jordan prices found

OpenSooq (Arabic listings, private sellers):

- Dahua 16GB — 30 JOD each
- Kingston 16GB DDR4-3200 — 45 JOD each
- Kingston Fury DDR4-3200 32GB — 100 JOD

Retailers (the internally consistent cluster — anything at 25-75 JOD is stale):

| Retailer | Item | JOD | ≈USD |
|---|---|---|---|
| City Center | 16GB DDR4-3200 CL17 | 99 | $140 |
| City Center | 32GB DDR4-3600 CL18 | 129 | $182 |
| GTS | Kingston 16GB DDR4-3200 CL22 | 120 | $169 |
| Smart Systems | Apacer U-DIMM DDR4-3200 16GB | 99 | $140 |

**Hazard on OpenSooq: most 16GB DDR4 listings surfaced were laptop SO-DIMM, not desktop DIMM.**
Arabic listings often say only "رام 16 جيجا DDR4". Insist on seeing the module — 288-pin
full-length, not 260-pin.

### Gardens Street, Amman — go here first

**Wasfi Al-Tal Street (شارع الجاردنز)** is Amman's computer-hardware street. Major retailers sit
within walking distance:

- **City Center Computers** — Pizza Hut Building No. 28. Sat-Wed 08:00-18:30, Thu 08:00-15:00, Fri closed
- **Oriental Store (OS)** — Building No. 80. Sat-Wed 09:00-18:00, Thu closed
- **Compu Jordan** — Compu Jordan Complex 89. Sat-Thu 10:00-20:00
- **MIDTeks** — Gardens branch

Three-plus competing shops on one street during a shortage is exactly the situation where walking
in beats browsing. The websites are demonstrably stale; in person you negotiate, see real stock,
and verify DIMM vs SO-DIMM.

Also: MIDTeks Al-Abdali branch; Midas Computer Center (stocks Kingston FURY Beast 8-32GB DDR4);
PC Circle; iGeek Megastore; Green Dara Stars. Price aggregator worth trying: `souqprice.com/jo`.

Ruled out: **SmartBuy Jordan does not sell standalone RAM modules** (complete systems only).
**Prince Mohammad Street could not be verified** as a computer-parts district — drop that lead.
Downtown King Faisal St is tourist retail now.

### eBay prices (indicative only)

- 64GB 4x16 Corsair Vengeance LPX, used: **$255-260** (~$4/GB)
- 64GB 4x16, open box: **$350**
- 64GB 2x32 Corsair Vengeance RGB Pro 3600: **$400**
- 32GB 2x16 G.Skill Aegis DDR4-3200, new, free shipping: **$129.99** (~$4.06/GB — standout if genuine)
- Single 32GB UDIMM: eBay's own price facets bucket these at **$250-450**

**Do not buy single 32GB sticks separately** — two singles cost more than a matched kit and lose
the binning guarantee.

New retail 64GB DDR4-3200 in the US is roughly **$500-650** (trackers disagree; RamRadar's
$7.83/GB on 15 Sep 2026 cross-checks best).

### Import mechanics

- **De minimis: JD 200.** Jordan doubled it from JD100 and cancelled the annual per-person ceiling.
- Under JD 200: a **flat 10% fee, minimum JOD 5** (Aramex Jordan customs notice).
- **Unresolved conflict:** Jordan Times/Roya frame the 10% as *replacing* VAT under JD200; Stackry
  says sales tax still applies. Budget for the worse case (10% + 16%).
- GST is **16%**, applied to **CIF + duty**, not item price alone.
- **Computer parts are effectively duty-free** at MFN level — HS 8471/8473 are rated Free. The
  binding cost is sales tax plus carrier fees, not duty.
- Aramex notes a **JOD 70 fee per shipment presented to customs** on formal declarations, i.e.
  over JD 200. That is a large cliff.

**Keep each shipment under JD 200 (~$282).** For 64GB that means splitting into two shipments.
Landed multiplier on the USD item price: **~1.33x best case to ~1.51x if GST stacks.** Crossing
JD 200 pushes it toward **1.7-1.9x**.

Amazon.ae ships to Jordan with an **Import Fees Deposit collected at checkout**, converting
customs risk into a fixed visible number. Noon.com ships to Jordan — unconfirmed, assume not.
Most US eBay sellers do not ship to Jordan directly; the usual route is a US package forwarder
(Aramex Shop & Ship being the standard in Jordan), 8-12 days door to door.

---

## 4. 2 x 32GB vs 4 x 16GB

**Buy 2 x 32GB as a single matched kit, if the platform supports 32GB DIMMs.**

A rank is a 64-bit-wide set of chips the controller addresses as one group. Each channel tolerates
a limited number before signal integrity degrades.

| Config | DIMMs/channel | Ranks/channel | Load |
|---|---|---|---|
| 2 x 32GB (2Rx8) | 1 | 2 | moderate |
| 4 x 16GB single-rank (1Rx8) | 2 | 2 | higher — 2 electrical loads |
| 4 x 16GB dual-rank (2Rx8) | 2 | **4** | worst case |

16GB DDR4 UDIMMs ship as **both** 1Rx8 and 2Rx8, and listings usually don't say. A 32GB non-ECC
UDIMM is essentially always 2Rx8. So 2x32GB gives the same 2 ranks per channel as a good 4x16
single-rank kit, with **half the physical loads on the bus**. That is the whole argument.

Dual-rank is also a small *performance win* — rank interleaving hides row activation latency,
typically 2-5% on Ryzen at the same frequency. 2 x 32GB is not a compromise; at a given speed it
is the fastest of these options.

**Why 4 sticks miss rated speed on Ryzen.** AMD's own guidance drops hard by DIMM count and rank:

- **Zen 2/3 (Ryzen 3000/5000, AM4):** 2 DIMMs dual-rank → DDR4-3200. **4 single-rank → 2933.
  4 dual-rank → 2667.**
- **Zen/Zen+ (Ryzen 1000/2000):** 4 x dual-rank officially lands at **DDR4-1866.**

On Ryzen the memory clock ties to Infinity Fabric, so 3200 → 2667 is real performance, several
percent. Meanwhile 2 x 32GB at 3200 with DOCP is usually a single-toggle first-boot success on any
AM4 board from B450 up. Command rate compounds it: 2 DIMMs often run 1T, 4 DIMMs almost always 2T.

**On Intel**, ring-bus controllers tolerate 4x16 better, but expect VCCSA/VCCIO bumps to
1.20-1.25V and training instability. On **locked non-Z boards it is moot** — B360/H370/B365
ignore XMP entirely. Intel only unlocked memory OC on mainstream chipsets at B560/H570.

**Trace topology.** Roughly 90%+ of consumer 4-slot boards are **daisy-chain**, optimised for 2
DIMMs in the far slots (A2/B2, normally the 2nd and 4th counting away from the CPU). Filling all
four adds mid-line stubs and reflections — precisely why XMP falls apart. T-topology boards exist
(HEDT, some ROG Apex/MSI) but assume daisy-chain unless proven otherwise.

Treat the two free slots as a minor tiebreaker, not a plan. You cannot buy a guaranteed-matching
pair later, and 4 x 32GB is four dual-rank DIMMs, the worst config there is.

**If buying 4x16:** one factory-matched 4-stick kit, never two 2x16 kits. Prefer single-rank
(1Rx8) if identifiable.

---

## 5. The existing 2 x 8GB sticks — sell them

**2 x 8GB + 2 x 32GB = 48GB, not 64GB.** DDR4 has no 24GB UDIMM. Reaching exactly 64GB requires
either 4 x 16GB or 2 x 32GB, so the 8GB sticks come out regardless. That settles most of it.

Why mixing is bad even where capacity works:

- **XMP/DOCP is per-kit, not per-stick.** The board applies one profile to all DIMMs. Mixed
  modules give you: the fast profile applied to sticks that can't cope (instability), the slow
  profile applied to everything (wasted money), or failed training (no boot).
- **JEDEC fallback.** When XMP is off or fails, DDR4 falls back to the fastest JEDEC profile common
  to every stick — typically **2133 or 2400**. A mixed 3200 + 2666 set very commonly runs the whole
  system at **2133 CL15**. You'd pay 2026 prices to run slower than stock.
- **Different ICs.** 2666 sticks are 8Gbit die, almost certainly 1Rx8. A 32GB module is 16Gbit 2Rx8.
  Samsung B-die vs Hynix CJR vs Micron E-die differ in tRFC, tRC and voltage behaviour.
- **Training failures.** Mixed rank/density is the classic cause of 30-90s black-screen boots, DRAM
  debug-LED hangs, boards auto-clearing CMOS, and "boots fine, crashes randomly" weeks later.

Sell them, and sell them now. In the 2026 shortage, 8GB DDR4-2666 sticks have real resale value —
they're the standard upgrade for the large installed base of office PCs in the region. **OpenSooq**
and local Facebook groups beat shop trade-in. Sell as a **matched pair with a photo of the label**.
Run MemTest86 first so you can say "tested clean, from a working system" — worth a premium in a
used market full of dead pulls.

---

## 6. Buy 3200 CL16, even on a 2666 board

**Downclocking is automatic and safe; upclocking is not.** A DDR4-3200 module's SPD carries
standard JEDEC entries for 2133/2400/2666. Dropped into a 2666-only board it simply boots at 2666,
zero configuration. A 2666 module in a 3200-capable board runs at 2666, full stop.

The price delta is small right now — the shortage compressed the speed premium, and DDR4 is priced
by capacity. 3200 CL16 is often within a few percent of 2666 and frequently *more available*.

On a board that only does 2666: non-Z Intel hard-locks to CPU stock spec (the XMP toggle may not
even appear); it boots, it's stable, nothing is damaged. Older AMD A320/B350 usually *do* allow
memory OC, so a 3200 kit may well run at 3200 anyway.

Target spec: **DDR4-3200 CL16, 1.35V, non-ECC UDIMM, 2Rx8, 288-pin.** CL18 acceptable and cheaper.
Don't chase CL14 (B-die, collector-priced) or 3600 (needs FCLK 1800 on AM4, pointless on locked Intel).

---

## 7. ECC / RDIMM / SODIMM — the #1 way to waste money

Cheap "64GB DDR4 server RAM" is nearly always **RDIMM**, electrically incompatible with every
consumer board. It will not post. The seller often isn't lying — "Server Memory" *is* the disclosure.

| Type | Works in a desktop? |
|---|---|
| UDIMM non-ECC | ✅ this is what you want |
| UDIMM ECC | ⚠️ usually boots with ECC inactive; costs more; don't seek out |
| RDIMM (Registered) | ❌ will not work |
| LRDIMM | ❌ will not work |
| SODIMM (260-pin) | ❌ won't physically fit |

**Golden rule 1 — the rank/width field.** `1Rx8`, `2Rx8`, `1Rx16` = desktop ✅. **`2Rx4`, `4Rx4`,
`1Rx4` = server RDIMM/LRDIMM ❌** — x4 chips exist almost exclusively on server modules. A 32GB
non-ECC UDIMM should read **2Rx8**.

**Golden rule 2 — the suffix letter after the speed code.** In `PC4-2666V-UA2-11`:

| Suffix | Meaning |
|---|---|
| `-U` | Unbuffered non-ECC ✅ |
| `-E` | Unbuffered ECC ⚠️ |
| `-R` | Registered ❌ |
| `-L` | Load-Reduced ❌ |
| `-S` | SODIMM ❌ |

One letter separates a working purchase from a paperweight.

**Part number prefixes:**

- **Samsung:** `M378` = non-ECC UDIMM ✅ · `M391` = ECC UDIMM · `M393` = RDIMM ❌ · `M386` = LRDIMM ❌ · `M471` = SODIMM ❌
- **SK Hynix:** `HMA...U6...` = UDIMM non-ECC ✅ · `U7` = ECC UDIMM · `R7`/`R8` = RDIMM ❌ · `S6` = SODIMM ❌
- **Micron:** `...64...` = 64-bit = non-ECC ✅ · `...72...` = ECC ⚠️ · suffix `AZ` = unbuffered ✅, `PZ`/`PDZ` = Registered ❌
- **Kingston:** `KVR26N19S8/8` — N = non-ECC ✅, S8 = single rank x8. `KVR26E...` E = ECC ⚠️. `KSM32R...` R = Registered ❌
- **Crucial:** `CT16G4DFD832A` — D = UDIMM ✅, S = SODIMM, R = RDIMM ❌, W = ECC UDIMM

**Photo test:** 8 chips per side evenly spaced = non-ECC UDIMM ✅. 9 or 18 chips = ECC. A small
extra chip centred on the PCB between two DRAM groups = register/buffer = RDIMM ❌. 36 tiny chips
= server RDIMM/LRDIMM ❌. **Never force a module that won't drop in — you'll destroy the slot.**

Good value SKUs: G.Skill Ripjaws V `F4-3200C16D-64GVK` (2x32), Crucial `CT2K32G4DFD832A` (runs
**JEDEC 3200 CL22 without XMP**, so it boots in anything including locked OEM boards), Corsair LPX
`CMK64GX4M2E3200C16` (deepest used market), Kingston Fury `KF432C16BBK2/64`.

---

## 8. Scam patterns and price floors

Five patterns:

1. **Relabeled generic modules** — "Low Density" in the title is a tell, stock photos, no brand.
2. **ECC RDIMM sold as desktop RAM** — biggest cause of "it won't boot."
3. **SODIMM listed under desktop searches** — rampant. **288-pin = desktop, 260-pin = laptop.**
4. **Mining/server pulls as "tested working"** — 24/7 at elevated temps, no photo of the actual sticks.
5. **Empty-package fakes** — Tom's Hardware documented scammers soldering hollow plastic packages
   with no die to PCBs and relabeling them as Samsung/Hynix/Kingston/Corsair. Kingston and Transcend
   are reported as the most heavily faked brands.

Red flags: stock photos only · seller won't send a CPU-Z SPD screenshot · part number contradicts
the title · "ECC Reg" alongside a UDIMM part number · new or long-dormant seller account · CN
seller with "Ship from US" · price far below the rest of the page.

**Estimated fake thresholds** (derived from $7.83/GB retail and the ~$4/GB used band, shipped):

| Config | Plausible used floor | Below this, assume fake |
|---|---|---|
| 64GB (2x32 or 4x16) | ~$220 | **under $150** |
| 32GB (2x16) | ~$100 | **under $70** |
| Single 32GB UDIMM | ~$110 | **under $80** |
| Single 16GB UDIMM | ~$55 | **under $35** |

A live example found: a listing titled *"64GB Kit (2x32GB) DDR4-3200 **ECC Reg** Samsung
**M378**A4G43AB2-CWE — $359."* The M378 prefix means non-ECC UDIMM; the title says ECC Registered.
One of the two is wrong and you can't tell which without asking.

---

## 9. Questions to ask a seller

1. Clear in-focus photo of the label on **each** stick, plus the bare PCB. Refusal → walk away.
2. Exact full part number on each module. Not "DDR4 2666 16GB."
3. UDIMM non-ECC, or ECC/Registered? A seller who doesn't know is a seller who doesn't know if they work.
4. Do the labels say 1Rx8, 2Rx8 or 2Rx4?
5. Single matched kit, or individually sourced? (Critical for a 4x16 buy.)
6. Tested together in one system? Which board? How many MemTest86 passes?
7. Pulls from working systems, or untested stock? "Sold as-is" means no recourse.
8. Returns accepted, and does the window start from delivery?
9. Warranty stickers intact? Ever RMA'd?
10. Close-up of the gold fingers — bent pins, corrosion, scorch marks?

Pay through eBay checkout only, never bank transfer, never off-platform. Prefer Top Rated Plus
with 500+ feedback. Screenshot the full listing at purchase — sellers edit listings.

---

## 10. Install and test

Install 2 DIMMs in **slots A2 and B2** (normally 2nd and 4th counting away from the CPU — check the
manual). Enable **XMP / DOCP / EOCP / A-XMP Profile 1** in BIOS. First boot after a memory change
can take 30-90 seconds of training with a black screen. That is normal — don't hit reset.

Verify in CPU-Z: Memory tab should show half your target DDR number (1600 MHz = DDR4-3200) and
Dual channel.

1. **MemTest86** (PassMark, free, bootable USB). **Minimum 4 full passes, run overnight** — 64GB is
   ~1.5-3 hours per pass, so 4 passes ≈ 6-12 hours. **Any single error = bad.** There is no
   acceptable error count. On errors, retest with XMP off to separate a bad module from an unstable
   overclock, then test sticks one at a time to identify the culprit.
2. **memtest86+ v7.x** — free, open source, UEFI-capable, in most Linux repos. Same 4-pass rule.
3. **Windows Memory Diagnostic** (`mdsched.exe`) — weak. 20-minute smoke test only, never sign-off.
4. **TestMem5 with anta777 Extreme** (1-3h) or **HCI MemTest** to 400%+ coverage, for IMC stability
   under load. Linux: `sudo memtester 56G 3` or `stressapptest -s 3600 -M 56000 -W`.

**Return-window reality:** eBay Money Back Guarantee is ~30 days **from delivery**, so shipping
time doesn't eat the window — but you have no slack. **Test within 24-48 hours of arrival.**
Photograph the sealed package, photograph each label, screenshot the MemTest86 results screen.
Open a case inside the window even if the seller seems cooperative.

Note that **return postage from Jordan may exceed the value of the RAM**, and many sellers won't
cover international returns. That is the strongest argument for buying locally, or buying new with
a manufacturer warranty — Kingston Fury, Corsair, G.Skill and Crucial carry lifetime warranties
handled by the manufacturer, which sidesteps the seller entirely.

---

## 11. Recommendation

1. **Run the four commands in §2 first.** Nothing else can be decided without the board model.
2. **Go to Wasfi Al-Tal / Gardens Street in person.** Price 2x32GB and 4x16GB at City Center,
   Oriental Store and Compu Jordan on one afternoon. Go Sat-Wed; Oriental closes Thursday, City
   Center closes Friday.
3. **Target 2 x 32GB DDR4-3200 CL16 non-ECC UDIMM, one matched kit, ~258 JOD.** Falls back to
   4 x 16GB only if the platform caps at 16GB per DIMM.
4. **Skip the eBay import.** The 1.33-1.51x landed multiplier cancels the US price advantage, and
   you lose returns and warranty across a border.
5. **Use OpenSooq as the cheap alternative** (~120-200 JOD) if willing to MemTest before paying.
   Verify 288-pin desktop DIMM, not SO-DIMM.
6. **Sell the 2 x 8GB pair on OpenSooq** — they can't be part of any 64GB config and they're worth
   unusual money right now.
7. **Buy the full 64GB in one purchase.** Prices only go one direction in this market.

### Open items requiring verification

- **Motherboard and CPU model** — the single blocking unknown.
- Whether the 69-75 JOD 32GB kits are genuinely in stock anywhere. If so they're half world price
  and worth buying on sight.
- Whether Jordan's under-JD200 10% flat fee **replaces or stacks with** the 16% GST. Moves the
  import case by ~12%.
- Whether eBay International Shipping covers Jordan — verify at checkout before bidding.
- All eBay and Jordanian retailer prices, on an unblocked connection.

---

## Sources

Market: TrendForce spot update 16 Sep 2026 · TrendForce contract 3 & 9 Jul 2026 · TweakTown/DigiTimes
Q3 2026 DDR4 +50% · Tom's Hardware RAM price index 2026 · Tom's Hardware on Framework price warning ·
TechPowerUp DDR4 shortage · WCCFTech shortage to Q4 2027 · RamRadar $7.83/GB 15 Sep 2026 ·
rampricesusa 64GB 90-day average

Counterfeits: Tom's Hardware on empty-plastic-package DDR5 fakes · tekniskill counterfeit chip guide

Compatibility: Tom's Hardware Ryzen 5000 RAM guide · TechSpot Ryzen 5000 memory performance ·
Overclock.net AMD 4-DIMM rank guidance · Wikipedia LGA 1151 memory limits

Jordan: Jordan Times and Roya News on the JD200 de minimis · Aramex Jordan customs notice ·
Easyship Jordan duties calculator · Central Bank of Jordan rate 17 Sep 2026
