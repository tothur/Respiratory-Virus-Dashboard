# KÉSZÜL - Soha nem látott fehérjéket álmodik meg a ProteinMPNN mesterséges intelligencia

## Az új mélytanulási algoritmus forradalmasíthatja terápiákhoz és molekuláris gépekhez szükséges fehérjetervezést. Korábbi módszereknél sokkal gyorsabb, és többnyire a valóságban is működnek az általa tervezett molekulák.

A fehérjék térbeli szerkezetének [feltárása után](https://qubit.hu/2022/02/04/attorest-hoz-a-biologiaba-a-minden-eddiginel-pontosabb-feherjekutato-algoritmus-az-alphafold2) most új fehérjék tervezését is forradalmasíthatja a mesterséges intelligencia. A ProteinMPNN mélytanulási algoritmus egyszerre sokkal gyorsabb a korábbi módszereknél, és nagyobb eséllyel generál működő molekulákat, ami megkönnyítheti a kutatóknak új, terápiákhoz szükséges molekulák létrehozását.

David Baker biokémikus vezetésével a Washingtoni Egyetem biokémiai tanszékének és fehérjetervezési intézetének kutatói fejlesztésükről két, a Science-ben közölt tanulmánnyal számoltak be szeptember közepén. Baker [szerint](https://www.ipd.uw.edu/2022/09/proteinmpnn-excels-at-creating-new-proteins/) az élővilágban előforduló fehérjék jóval kevesebb mint 1 százalékát fedik le a lehetséges szerkezeteknek, az új szoftverek pedig régóta húzódó, orvostudományi, energiatudományi, és technológiai problémákat oldhatnak meg.

Justas Dauparas és kollégái az új algoritmust és kísérleti tesztelését [mutatták be](https://www.science.org/doi/10.1126/science.add2187), míg Basile Wicky és munkatársai [ismertették](https://www.science.org/doi/10.1126/science.add1964), hogyan képes a ProteinMPNN azonos fehérje alegységekből felépülő, változatos struktúrákat megálmodni. Ez a kutatók szerint megnyithatja az utat a mainál bonyolultabb, nanotechnológiás molekuláris gépek létrehozásához.

Két éve a [DeepMind](https://deepmind.com/) AlphaFold2 algoritmusa minden korábbi számítási módszernél [pontosabban tárta fel](https://qubit.hu/2022/02/04/attorest-hoz-a-biologiaba-a-minden-eddiginel-pontosabb-feherjekutato-algoritmus-az-alphafold2), hogy a fehérjék aminosavsorrendje milyen térszerkezetet eredményez. A fehérje feltekeredést gyakorlati szemszögből szinte megoldó AlphFold2 azóta már 200 millió fehérje szerkezetét [határozta meg](https://qubit.hu/2022/07/28/200-millio-feherje-terszerkezetet-tarta-fel-egyetlen-ev-alatt-a-deepmind-feherjekutato-algoritmusa), amik elérhetők egy publikus [adatbázisban](https://alphafold.ebi.ac.uk/).

Az AlphaFold2-vel ellentétben a [GitHub-ról letölthető](https://github.com/dauparas/ProteinMPNN) ProteinMPNN új, természetben nem előforduló fehérjék aminosavsorrendjének tervezésére szolgál, amik szintézisük után feltekeredve kívánt szerkezetű, funkcionális molekulákká válhatnak. A biokémikusok erre többnyire eddig a [Rosetta](https://www.rosettacommons.org/software) fehérjetervező szoftvert használták, aminél a ProteinMPNN az amerikai kutatók által kísérletileg igazoltan pontosabb, és közel 200-szor gyorsabb. 

A ProteinMPNN mellett több más kutatócsoport is fejleszt fehérjetervező algoritmusokat, mint például Noelia Ferruz és kollégái által idén nyáron a Nature Communications-ben [ismertetett](https://www.nature.com/articles/s41467-022-32007-7) ProtGPT2.

## Nem csak gyorsabb a korábbi módszereknél, többször is tervez működő molekulákat

A Rosetta a fehérjetervezést egy energia-optimalizáló problémaként kezeli, ahol egy adott háromdimenziós szerkezethez a legkisebb energiaszintű az aminosavkombinációt keresi meg, ami rendkívül számításigényes folyamat.

A [fehérjék](https://en.wikipedia.org/wiki/Protein) egy vagy több [polipeptidláncból](https://en.wikipedia.org/wiki/Peptide) épülnek fel, amelyek peptidkötéssel egymáshoz kapcsolódó aminosav-maradékok (residue) láncolatából állnak. A főlánc (peptidgerinc) a polipeptidláncnak a nagyrészt ismétlődő, a lánc változatosságáért felelős [aminosav oldalláncoktól](https://en.wikipedia.org/wiki/Amino_acid#Side_chains) mentes része.

A ProteinMPNN a fehérje szekvenciáját a főlánc jellemzői, például az egyes szénatomok közti távolság, vagy a szénatomok egymáshoz viszonyított orientációja alapján határozza meg. Dauparas és kollégái több ezer nagy-részletességű, kísérleti módszerekkel meghatározott fehérje struktúra segítségével tanították a ProteinMPNN-t, ami kezdetben így 50 százalékos pontosságot ért el.

Az algoritmus pontosságát a kutatók azzal mérik, hogy mennyire képes egy létező fehérje aminosavsorrendjét rekonstruálni (sequence recovery) annak ismert, háromdimenziós térszerkezetéből, ami lényegében az AlphaFold2 feladatának fordítottja. Ahhoz pedig, hogy a ProteinMPNN széleskörű alkalmazásoknál működjön, mindkét (N- és C-terminális) irány felé képes a polipeptidláncnál ennek meghatározására, ami tovább javított precizitásán.

Minden optimalizáció után a ProteinMPNN a Rosetta 32,9 százalékánál jelentősen jobban, 52,4 százalékos pontossággal volt képes az aminosavsorrendet rekonstruálni. Mindezt 100 aminosavmaradékra, és egy processzorra vetítve 1,2 másodperc alatt tette, szemben a Rosetta 258,8 másodpercével.

Ha egy kicsit engedtek a kutatók az algoritmus pontosságából azzal, hogy nagyobb szimulált hőmérsékleten vizsgálódott, sokkal változatosabb szekvenciákat kaptak. Ez előnyös a legtöbb alkalmazáshoz, mivel így több szekvenciát lehet kísérletileg tesztelni, és nagyobb az esélye, hogy valamelyik működni fog.

Mivel a rekonstrukciós precízitás a kutatók szerint nem vág egybe pontosan azzal, hogy a tervezett fehérjék valóban fel is tekerednek és funkcionálnak, a ProteinMPNN tudását kísérletileg is tesztelték. Egy ilyenben az algoritmus nanorészecskéket tervezett, amelykhez hasonlót kísérleti [oltásoknál is alkalmaznak](https://www.nature.com/articles/s41586-021-03365-x). A 76 szekvencia tervet a kutatók *Escherichia coli* baktériumban szintetizálták, és 13 esetben kaptak tömegüket tekintve megfelelő struktúrát. Az egyik térszerkezetét [röntgendiffrakciós-szerkezetvizsgálati](https://en.wikipedia.org/wiki/X-ray_crystallography) módszerrel meghatározták, ami nagyon jól egybevágott a kutatók létrhozni kívánt fehérjemodelljével.

Más kísérleteknél a ProteinMPNN képes volt helyreállítani a Rosettával vagy AlphaFolddal készített, hibás fehérjeterveket, ami miatt az algoritmus a Naturenek [nyilatkozó szakember szerint](https://www.nature.com/articles/d41586-022-02947-7) egyfajta ellenőrzésként is használható lehet majd AlphaFoldos szekvenciákhoz. 

Emellett a ProteinMPNN által generált mesterséges szekvenciák még biztosabban tekeredtek fel a természetes fehérje főlánchoz, mint a fehérje eredeti szekvenciái. Emellett olyan bonyolult fehérjetervezési problémákkal is meg tudott küzdeni, amelyekkel a Rosetta nem.

További előnye az algoritmusnak a kutatók szerint, hogy nincs szüksége arra, hogy adott fehérjetervezési problémához testreszabják, többeknek elérhetővé téve a fehérjetervezést.

## Új fehérjéket álmodik az algoritmus

"Azt találtuk, hogy a ProteinMPNN-el készített fehérjéknél nagyobb esély volt arra, hogy megfelelően felterednek, és így nagyon komplex fehérjeszerkezeteket is létre tudtunk hozni" - [mondta el](https://www.sciencedaily.com/releases/2022/09/220915142503.htm) Wicky. A kutató és kollégái a mélytanulási algoritmussal a természetes fehérjestruktúrákon túli lehetőségeket kívánták felfedezni, amihez egy [hálózati hallucinációnak nevezett módszert](https://www.nature.com/articles/s41586-021-04184-w) alkalmaztak.

Ennek segítségével különböző, szimmetrikus fehérje szerkezeteket generáltak, melyek azonos alegységből épülnek fel (homo-oligomer fehérje). Miután szintetizálták a struktúrákat, kriogén-elektronmikroszkópos (cryo-EM) vizsgálattal meghatározták a szerkezetüket. A 192-ből 7 darabnak a kristályszerkezete nagyon pontosan egyezett a számítógépes modellekkel. A kutatók szerint ez egy sokkal jobb arány, mint amit a Rosetta tipikusan el tud érni új fehérjék esetén.

A szakemberek úgy vélik, mindez azt mutatja, hogy innentől a mélytanulási modelleknek hála egy, a fehérje szerkezeti adatbázisokon túlmutató, új fehérjevilág tárult fel. Ma még a nagyobb és komplexebb struktúrák megálmodásához nagy számítási kapacitásra, és rengeteg memóriára van szükség, így Wickyék szerint a következő cél kevesebb paraméterrel rendelkező, könnyebben lefutó módszerek létrehozása.

"A ProteinMPNN-hez hasonló mélytanulási módszerek átírták a játékszabályokat. Megrajzolod a fehérjédet, megnyomsz egy gombot, és kapsz valamit, ami tízből egyszer működik." - mondta a Nature-nek a kutatásban nem résztvevő Arne Elofsson, Stockholmi Egyetemen dolgozó bioinformatikus.

*Kapcsolódó cikkek a Qubiten:*

https://qubit.hu/2022/02/04/attorest-hoz-a-biologiaba-a-minden-eddiginel-pontosabb-feherjekutato-algoritmus-az-alphafold2

https://qubit.hu/2022/08/30/a-muanyagevo-bakteriumok-mar-a-kuszobon-allnak-csak-fel-ne-faljak-az-egesz-konyhat

https://qubit.hu/2022/04/05/forradalmi-attores-a-mesterseges-intelligencia-a-dns-bol-megmondja-hogyan-fognak-kifejezodni-a-genek