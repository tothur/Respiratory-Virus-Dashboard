# Megoldották az önvezető autók egyik legnagyobb problémáját, már a rossz időjárás sem jelent nekik akadályt

## Az oxfordi egyetem kutatói által valós körülmények közt tesztelt GRAMME mélytanulási algoritmus okosan összerakja a kamerák, lézeres szenzorok és időjárásálló radarok adatait. Így hamarosan már az eső, hó, vagy köd sem jelent majd problémát az önvezető autóknak.

Az eltérő szenzorok adatait egyesítő GRAMME mesterséges intelligencia megoldhatja az önvezető autók egyik fő problémáját, ezzel közelebb hozva elterjedésüket - derül ki a Nature Machine Intelligence folyóiratban múlt héten [közölt kutatásból](https://www.nature.com/articles/s42256-022-00520-5).

Az oxfordi egyetem kutatója, Yasin Almalioglu és kollégái szerint az önvezető járművek igazán akkor lesznek biztonságosak és megbízhatóak, ha rossz környezeti vagy időjárási körülmények esetén is precízen tudják, hol vannak. Ezt nehezíti, hogy ilyenkor a navigációhoz használt kamerák vagy lézeres távérzékelők (LIDAR) teljesítménye jelentősen csökkenhet, az időjárásálló radarok felbontása viszont nem mindig elegendő.

Az esőben, ködben, vagy hóban vezetés nagy kihívást jelent a mesterséges intelligenciának - és ez szerintük részben megmagyarázza, hogy a rendkívüli erőfeszítések ellenére miért nem sikerült eddig az utakra vinni az önvezető autókat kisebb teszteken kívül. Ha sikerül a  problémát megoldani, megnyílhat az út az önvezető autók széleskörű elterjedése felé, amivel csökkenthet a balesetek és a dugók száma, illetve javúlhat a túlzsúfolt városok közlekedése.

A szenzorok fejlett algoritmusokkal történő egyesítése nem csak az önvezető autóknál kerül elő. Ez az egyik nagy újítása az ötödik generációs vadászgépeknek, különösen az amerikai F-35 Lightningnak, ahol a szenzorfúzió egységes formában tárja a pilóta elé a gép körül zajló eseményeket, 

## Itt a szenzorfúzió

Az önvezető autóknak néhány centiméterre kell ismerniük a térképen elfoglalt helyzetüket. Ezt a GPS és a hozzá hasonló globális műholdas helymeghatározó rendszerek (GNSS) méteres pontosággukkal nem tudják biztosítani. Különösen igaz ez olyan, például magas épületekkel borított városi környezetkben, ahol a műholdakból érkező rádiójelek leromlanak.

Ennek megoldásában segít a környezetükhöz viszonyított mozgó pozíciójuk (ego-motion) meghatározása, mely különböző szenzorok segítségével történik. Ezek működésére viszont jelentős hatással vannak az időjárási viszonyok, a látható tartományban dolgozó kamerákat zavaró közvetlen napfénytől az infravörös tartományban mérő LIDAR-ok hatósugarát korlátozó ködig. Hozzájuk képest a milliméteres hullámhosszú radarok a kutatók szerint lényegében immunisak ezekre és bármilyen napszakban működnek.

A GRAMME mélytanulási algoritmusuk figyelmesen egyesíti a kamerák, lidarok és radarok nyert információkkal, úgy, hogy az mindegyik szenzor előnyeit ki tudja használni. A kamerák esetén a kutatók szerint ilyen gazdag vizuális információjuk, a lidarnál finom felbontásúk és a radarnál a rossz időjárásnak való ellenállóképességük. Az önellenőrző neurális hálózattal működő GRAMME, mely GitHub-on szabadon elérhető, a szenzoradatok alapján az objektumok térbeli elhelyezkedését rekonstruálja.

A módszerük az egyes bejövő adatok pontosságát folyamatosan értékeli, állításuk szerint ezzel kiküszöbölve a más-más műszerekből érkező adatok hiányosságait, így például azt, hogy a milliméteres radarok még mindig kisebb felbontásúak és zajosabbak, mint a kamerák vagy lidarok.

Algoritmusok jól teljesített a nappali és éjszakai körülmények közt esőben, ködben, hóban végzett kísérletekben, túlszárnyalva az eddigi legjobb megoldásokat. GRAMME emellett jól tudott általánosítani normál tréning adatok alapján nehezebb viszonyokra is, és nem kötődik néhány specifikus szenzorhoz.


A kutatók arra számítanak, hogy munkájuk egy lépéssel közelebb hozhatja, hogy az önvezető autók biztonságosan tudjanak szinte bármilyen időjárási viszontagság közepette közlekedni.

*Kapcsolódó cikkek Qubiten:*
