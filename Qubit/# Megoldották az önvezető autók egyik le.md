# Megoldották az önvezető autók egyik legnagyobb problémáját, már a rossz időjárás sem jelent nekik akadályt

## Az oxfordi egyetem kutatói által kifejlesztett GRAMME mélytanulási algoritmus okosan összerakja a kamerák, lézeres szenzorok és időjárásálló radarok adatait. Így hamarosan már az eső, hó, vagy köd sem jelent majd problémát az önvezető autóknak.

Az eltérő szenzorok adatait egyesítő GRAMME mesterséges intelligencia megoldhatja az önvezető autók egyik fő problémáját, ezzel közelebb hozva elterjedésüket - derül ki a Nature Machine Intelligence folyóiratban múlt héten [közölt kutatásból](https://www.nature.com/articles/s42256-022-00520-5).

Az oxfordi egyetem kutatója, Yasin Almalioglu és kollégái szerint az önvezető járművek igazán akkor lesznek biztonságosak és megbízhatóak, ha rossz [környezeti](https://qubit.hu/2022/02/02/otvenezer-autot-hiv-vissza-a-tesla-amiert-nem-allnak-meg-a-stoptablanal) vagy időjárási körülmények esetén is precízen tudják, hol vannak. Ezt nehezíti, hogy ilyenkor a navigációhoz használt kamerák vagy lézeres távérzékelők (LIDAR) teljesítménye jelentősen csökkenhet, az időjárásálló radarok felbontása viszont nem mindig elegendő.

Az esőben, ködben, vagy hóban vezetés nagy kihívást jelent a mesterséges intelligenciának - és ez szerintük részben megmagyarázza, hogy a rendkívüli erőfeszítések ellenére [100 évnyi fejlesztés](https://qubit.hu/2021/03/04/mar-az-1940-es-evek-reklamjai-is-az-onvezeto-es-repulo-autok-eljovetelet-hirdettek) után miért nem sikerült eddig az utakra vinni a teljesen önvezető autókat kisebb teszteken kívül. Ha sikerül a  problémát megoldani, megnyílhat az út az önvezető autók széleskörű elterjedése felé, amivel csökkenthet a balesetek és a dugók száma, illetve javúlhat a túlzsúfolt városok közlekedése.

Ebbe az irányba jelenthet egy lépést a GRAMME mélytanulási algoritmus, mely az autó helyzetének pontosságát nézve minden eddigi megoldásnál jobban teljesített a kutatók szerint különböző napszakokban és időjárási körülmények közt végzett tesztekben. 
A GRAMME algoritmus Python programozási nyelven írt csomagként GitHub-on [szabadon elérhető](https://github.com/yasinalm/gramme). 

A szenzorokból érkező információ fejlett algoritmusokkal történő kombinálása nem csak az önvezető autóknál kerül elő. Ez az egyik nagy újítása az ötödik generációs vadászgépeknek, különösen az amerikai F-35 Lightningnak, amelynél a szenzorfúzió összegezve tárja a pilóta elé a gép körül zajló eseményeket, ezzel jelentősen segítve munkáját. 

## GRAMME egyesíti a kamerák, lidarok és radarok előnyeit

Az önvezető autóknak néhány centiméterre kell ismerniük a térképen elfoglalt helyzetüket. Ezt a GPS és a hozzá hasonló globális műholdas helymeghatározó rendszerek (GNSS) [méteres pontoságukkal](https://qubit.hu/2021/02/24/ez-lesz-az-ev-10-legfontosabb-technologiaja-az-mit-technology-review-szerint) nem tudják biztosítani. Különösen igaz ez olyan, például magas épületekkel borított városi környezetkben, ahol a műholdakból érkező rádiójelek leromlanak.

Ennek megoldásában segít a környezetükhöz viszonyított mozgó pozíciójuk (ego-motion) meghatározása, mely különböző szenzorok segítségével történik. Ezek működésére viszont jelentős hatással vannak az időjárási viszonyok, a látható tartományban dolgozó kamerákat zavaró közvetlen napfénytől az infravörös tartományban mérő LIDAR-ok hatósugarát korlátozó ködig. Hozzájuk képest a milliméteres hullámhosszú radarok a kutatók szerint lényegében immunisak ezekre és bármilyen napszakban működnek.

A mélytanulási algoritmus figyelmesen egyesíti a kamerák, lidarok és radarok nyert információkkal, úgy, hogy az mindegyik szenzor előnyeit ki tudja használni. A kamerák esetén a kutatók szerint ilyen gazdag vizuális információjuk, a lidarnál finom felbontásúk és a radarnál a rossz időjárásnak való ellenállóképességük. Az önellenőrző neurális hálózattal, és figyelemalapú tanulással működő algoritmus a szenzoradatok alapján az objektumok háromdimeziós, térbeli elhelyezkedését rekonstruálja. GRAMME önellenőrzési képessége miatt a kutatók szerint jelentősen nagyobb adatbázisokból tud tanulni.

A módszerük az egyes bejövő adatok pontosságát folyamatosan értékeli, állításuk szerint ezzel kiküszöbölve a más-más műszerekből érkező adatok hiányosságait, például azt, hogy a milliméteres radarok még mindig kisebb felbontásúak és zajosabbak, mint a kamerák vagy lidarok. Ugyanígy a rossz időjárási körülmények rontják a kamerák képminőségét, melyeket a programnak észlelni kell és ki kell szűrni.

Az algoritmust normál nappal rögzített adatokon tanították a szakemberek, míg a tesztek éjszakai, esőben, hóban, vagy ködben rögzített adatokkal mentek. Algoritmusok jól teljesített mindegyiknél, túlszárnyalva az eddigi legjobb megoldásokat, olyan körülmények esetén is, amelyekkel nem találkozhatott a tanulás alatt. 

GRAMME emellett jól tudott általánosítani normál tréning adatok alapján nehezebb viszonyokra is, és nem kötődik néhány specifikus szenzorhoz. A kutatók szerint az eltérő időjárási viszonyokra való általánosítás képessége azért is különösen fontos, mert az nem megoldható, hogy minden lehetséges körülményt lefedjenek az algoritmus tanulásához használt adatbázisokban.

A kísérletekben a csak kameraadatokkal dolgozó modellekhez képest sokkal jobb eredményt értek el a haladás és az elfordulás mértékének előrejelzésében a lidaros-kamerás, illetve kamerás-radaros modellek. A modulokból felépülő algoritmus az ellen is véd, ha a hardver, vagy a szoftver egy része elromlana. 

GRAMME további fejlesztésénél például radaros doppler mérésekkel való kiegészítését látják jó ötletnek, amellyel meg tudna kjülönböztetni mozgó és álló objektumokat, hogy még jobban értse környezetét.

A kutatók arra számítanak, hogy munkájuk közelebb hozhatja, hogy az önvezető autók biztonságosan tudjanak szinte bármilyen időjárási viszontagság közepette közlekedni. Az algoritmusok mellett legfontosabbnak az autókba integrálható, nagy-felbontású, háromdimenziós radarok fejlesztését tartják, melyek áttörést jelenthetnek majd az önvezető autóknak szerintük.

*Kapcsolódó cikkek Qubiten:*

https://qubit.hu/2022/03/24/a-kozuti-balesetek-akar-80-szazalekat-megelozheti-a-technologia-amelyben-egy-magyar-ceg-is-elen-jar

https://qubit.hu/2019/12/13/europa-legmenobb-tesztpalyajan-neztuk-meg-az-onvezeto-kozlekedes-jovojet

https://qubit.hu/2021/11/22/ez-egyszer-az-emberiseg-torteneteben-szeretnenk-nem-utolag-benazni-amikor-feltakaritunk-a-technologia-utan
