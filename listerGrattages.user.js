// ==UserScript==
// @name listeGrattages
// @namespace Violentmonkey Scripts
// @include */mountyhall/MH_Play/Actions/Competences/userscriptGrattage
// @include */mountyhall/MH_Play/Play_equipement.php
// @grant none
// @version 1.3
// ==/UserScript==
//

/* Utilisation :
 * 1) Installez ce script dans Violent Monkey
 * 2) Connectez-vous à MH avec 2 PAs restants (session active)
 * 3) Ayez sur votre trõll les parchemins à analyser
 * 4a) pour lancer l'outil, cliquer sur le bouton à côté des parchemins dans la page equipement
 * 4b) ou alors rendez-vous à l'adresse : https://games.mountyhall.com/mountyhall/MH_Play/Actions/Competences/userscriptGrattage
 *
 * Pour l'utiliser comme un script js classique lié à une page html, simplement mettre la constante STATIQUE à 1
 */

/* 2019-06-01 v1.0 : version de base
 * On peut cocher les glyphes à gratter pour voir directement l'effet final du parcho
 * On peut survoler le nom du parcho pour voir son effet initial
 * On peut survoler un glyphe pour voir les détails le concernant (je n'affiche juste pas les images)
 * On peut supprimer de la liste un parchemin qu'on n'estime pas intéressant à garder
 * Le petit numéro entre crochets indique le numéro initial de traitement du parcho dans la page, pratique pour s'y retrouver et voir combien de parchos sont traités au total
 * Le bouton pour afficher un récapitulatif affiche en début de page les grattages indiqués pour les parchemins gardés, facile à copier/coller.
 * */

/* 2019-06-02 v1.1 :
 * Affiche lite parchemins gardés et rejetés dans récapitulatif
 * Permet de supprimer des parchemins sur base d'une liste fournie
 * Affiche l'effet de base dans le récapitulatif
 */

/*  v1.2 :
 * intégration dans interface mh
 */

/*  v1.3 :
 * DOMParser pour traiter les requêtes et éviter les appels inutiles aux ressources images sur le serveur
 * introduction classes Parchemin et Glyphe pour avoir plus simple à traiter les données
 * refactoring complet pour rigoler
 * améliorations affichages résumé
 * Possibilité de filtrer et trier
 * Possibilité d'enregistrer et charger localement, en plus du chargement automatique depuis le hall
 * Possibilité d'importer et d'exporter au format texte
 */

// ****************************************************************************************************************************
// Inspiré de l'algorithme de détermination des effets des Grattages des gribouillages par trollthar (85665) et
// du script d'aide de Vapulabehemot, inspirés des recherche de Bran (El'Haine).
// ****************************************************************************************************************************

//-------------------------------- Debug Mode --------------------------------//
const debugLevel = 0;
function displayDebug(data, level = 1) {
    if (debugLevel >= level) {
        window.console.log("[listerGrattages]", data);
    }
}
displayDebug(window.location.href);

//---------------------- variables globales et constantes : Général -----------------------//

const STATIQUE = 1;               // 0 -> normal en ligne // 1 -> utilise pachemins hardcodés en bas de fichier
const EXPORTER_PARCHEMINS = 0;   // affiche en console l'enregistrement des parchemins après récupération dans le hall

const MAX_APPELS = 200;  // nombre maximum -1 de parchemins traités en une fois par l'outil
let compteurSecuriteNombreAppels = 0;

// attention au include Violent Monkey qui doit correspondre
const urlOutilListerGrattage = "/mountyhall/MH_Play/Actions/Competences/userscriptGrattage";

// affichage bonus malus
const COULEUR_BONUS = '#336633'; // vert '336633'
const COULEUR_MALUS = '#990000'; // rouge '990000'
const COULEUR_AUTRE = '#000000'; // noir '000000'
//const COULEUR_SANS_EFFET = '#707070'; // gris '707070'

const AU_MOINS = 1;
const AU_PLUS = -1;


//---------------------- variables globales et constantes : Analyse des glyphes  -----------------------//

// caractéristiques, avec les noms/abréviations utilisés dans MountyHall
// et dans l'ordre des affichages dans MountyHall
// ATT | ESQ | DEG | REG | Vue | PV | TOUR | Armure | Effet de Zone // plus Durée

const ATT   = 0;
const ESQ   = 1;
const DEG   = 2;
const REG   = 3;
const VUE   = 4;
const PV    = 5;
const TOUR  = 6;
const ARM   = 7;
const ZONE  = 8;
const DUREE = 9;
const TOUTES = 88;

const CARAC = [
    {
        id : 0,
        presentation : 'ATT',
        unite : [1,' D3']
    },
    {
        id : 1,
        presentation : 'ESQ',
        unite : [1,' D3']
    },
    {
        id : 2,
        presentation : 'DEG',
        unite : [1, '']
    },
    {
        id : 3,
        presentation : 'REG',
        unite : [1, '']
    },
    {
        id : 4,
        presentation : 'Vue',
        unite : [1, '']
    },
    {
        id : 5,
        presentation : 'PV',
        unite : [1, 'D3']
    },
    {
        id : 6,
        presentation : 'TOUR',
        unite : [-15, 'min']
    },
    {
        id : 7,
        presentation : 'Armure',
        unite : [1, '']
    },
    {
        id : 8,
        presentation : 'Effet de Zone',
        unite : [1, '']
    },
    {
        id : 9,
        presentation : 'Durée',
        unite : [1, 'Tour']
    }
];

//TODO : générer automatiquement
const CARACTERISTIQUES_GLYPHES = {

    '1320'  : [CARAC[ATT], CARAC[ATT]],
    '1344'  : [CARAC[ATT], CARAC[ESQ]],
    '3368'  : [CARAC[ATT], CARAC[DEG]],
    '4392'  : [CARAC[ATT], CARAC[ARM]],
    '5416'  : [CARAC[ATT], CARAC[REG]],
    '6440'  : [CARAC[ATT], CARAC[VUE]],
    '7464'  : [CARAC[ATT], CARAC[PV]],
    '8488'  : [CARAC[ATT], CARAC[TOUR]],
    '9512'  : [CARAC[ATT], CARAC[DUREE]],
    '10536' : [CARAC[ATT], CARAC[ZONE]],

    '11560' : [CARAC[ESQ], CARAC[ATT]],
    '12584' : [CARAC[ESQ], CARAC[ESQ]],
    '13608' : [CARAC[ESQ], CARAC[DEG]],
    '14632' : [CARAC[ESQ], CARAC[ARM]],
    '15656' : [CARAC[ESQ], CARAC[REG]],
    '16680' : [CARAC[ESQ], CARAC[VUE]],
    '17704' : [CARAC[ESQ], CARAC[PV]],
    '18728' : [CARAC[ESQ], CARAC[TOUR]],
    '19752' : [CARAC[ESQ], CARAC[DUREE]],
    '20776' : [CARAC[ESQ], CARAC[ZONE]],

    '21800' : [CARAC[DEG], CARAC[ATT]],
    '22824' : [CARAC[DEG], CARAC[ESQ]],
    '23848' : [CARAC[DEG], CARAC[DEG]],
    '24872' : [CARAC[DEG], CARAC[ARM]],
    '25896' : [CARAC[DEG], CARAC[REG]],
    '26920' : [CARAC[DEG], CARAC[VUE]],
    '27944' : [CARAC[DEG], CARAC[PV]],
    '28968' : [CARAC[DEG], CARAC[TOUR]],
    '29992' : [CARAC[DEG], CARAC[DUREE]],
    '31016' : [CARAC[DEG], CARAC[ZONE]],

    '32040' : [CARAC[ARM], CARAC[ATT]],
    '33064' : [CARAC[ARM], CARAC[ESQ]],
    '34088' : [CARAC[ARM], CARAC[DEG]],
    '35112' : [CARAC[ARM], CARAC[ARM]],
    '36136' : [CARAC[ARM], CARAC[REG]],
    '37160' : [CARAC[ARM], CARAC[VUE]],
    '38184' : [CARAC[ARM], CARAC[PV]],
    '39208' : [CARAC[ARM], CARAC[TOUR]],
    '40232' : [CARAC[ARM], CARAC[DUREE]],
    '41256' : [CARAC[ARM], CARAC[ZONE]],

    '42280' : [CARAC[REG], CARAC[ATT]],
    '43304' : [CARAC[REG], CARAC[ESQ]],
    '44328' : [CARAC[REG], CARAC[DEG]],
    '45352' : [CARAC[REG], CARAC[ARM]],
    '46376' : [CARAC[REG], CARAC[REG]],
    '47400' : [CARAC[REG], CARAC[VUE]],
    '48424' : [CARAC[REG], CARAC[PV]],
    '49448' : [CARAC[REG], CARAC[TOUR]],
    '50472' : [CARAC[REG], CARAC[DUREE]],
    '51496' : [CARAC[REG], CARAC[ZONE]],

    '52520' : [CARAC[VUE], CARAC[ATT]],
    '53544' : [CARAC[VUE], CARAC[ESQ]],
    '54568' : [CARAC[VUE], CARAC[DEG]],
    '55592' : [CARAC[VUE], CARAC[ARM]],
    '56616' : [CARAC[VUE], CARAC[REG]],
    '57640' : [CARAC[VUE], CARAC[VUE]],
    '58664' : [CARAC[VUE], CARAC[PV]],
    '59688' : [CARAC[VUE], CARAC[TOUR]],
    '60712' : [CARAC[VUE], CARAC[DUREE]],
    '61736' : [CARAC[VUE], CARAC[ZONE]],

    '62760' : [CARAC[PV], CARAC[ATT]],
    '63784' : [CARAC[PV], CARAC[ESQ]],
    '64808' : [CARAC[PV], CARAC[DEG]],
    '65832' : [CARAC[PV], CARAC[ARM]],
    '66856' : [CARAC[PV], CARAC[REG]],
    '67880' : [CARAC[PV], CARAC[VUE]],
    '68904' : [CARAC[PV], CARAC[PV]],
    '69928' : [CARAC[PV], CARAC[TOUR]],
    '70952' : [CARAC[PV], CARAC[DUREE]],
    '71976' : [CARAC[PV], CARAC[ZONE]],

    '73000' : [CARAC[TOUR], CARAC[ATT]],
    '74024' : [CARAC[TOUR], CARAC[ESQ]],
    '75048' : [CARAC[TOUR], CARAC[DEG]],
    '76072' : [CARAC[TOUR], CARAC[ARM]],
    '77096' : [CARAC[TOUR], CARAC[REG]],
    '78120' : [CARAC[TOUR], CARAC[VUE]],
    '79144' : [CARAC[TOUR], CARAC[PV]],
    '80168' : [CARAC[TOUR], CARAC[TOUR]],
    '81192' : [CARAC[TOUR], CARAC[DUREE]],
    '82216' : [CARAC[TOUR], CARAC[ZONE]],

    '83240' : [CARAC[DUREE], CARAC[ATT]],
    '84264' : [CARAC[DUREE], CARAC[ESQ]],
    '85288' : [CARAC[DUREE], CARAC[DEG]],
    '86312' : [CARAC[DUREE], CARAC[ARM]],
    '87336' : [CARAC[DUREE], CARAC[REG]],
    '88360' : [CARAC[DUREE], CARAC[VUE]],
    '89384' : [CARAC[DUREE], CARAC[PV]],
    '90408' : [CARAC[DUREE], CARAC[TOUR]],
    '91432' : [CARAC[DUREE], CARAC[DUREE]],
    '92456' : [CARAC[DUREE], CARAC[ZONE]],

    '93480' :  [CARAC[ZONE], CARAC[ATT]],
    '94504' :  [CARAC[ZONE], CARAC[ESQ]],
    '95528' :  [CARAC[ZONE], CARAC[DEG]],
    '96552' :  [CARAC[ZONE], CARAC[ARM]],
    '97576' :  [CARAC[ZONE], CARAC[REG]],
    '98600' :  [CARAC[ZONE], CARAC[VUE]],
    '99624' :  [CARAC[ZONE], CARAC[PV]],
    '100648' : [CARAC[ZONE], CARAC[TOUR]],
    '101672' : [CARAC[ZONE], CARAC[DUREE]],
    '102696' : [CARAC[ZONE], CARAC[ZONE]]
};


const FINESSES_GLYPHES = {
    0 : 'Très gras',
    1 : 'Gras',
    2 : 'Moyen',
    3 : 'Fin',
    4 : 'Très fin (version 3)',
    5 : 'Très fin (version 2)',
    6 : 'Très fin (version 1)',
};

// orientation
// const MOINS_PLUS = 0;
// const MOINS_MOINS = 1;
// const PLUS_MOINS = 2;
// const PLUS_PLUS = 3;

const ORIENTATIONS_GLYPHES = {
    0 : { nom : 'Initiale',             impact : [-1, +1], impactTexte : 'Malus | Bonus' },
    1 : { nom : 'Symétrie Horizontale', impact : [-1, -1], impactTexte : 'Malus | Malus' },
    2 : { nom : 'Symétrie Verticale',   impact : [+1, -1], impactTexte : 'Bonus | Malus' },
    3 : { nom : 'Symétrie Centrale',    impact : [+1, +1], impactTexte : 'Bonus | Bonus' }
};

//-------------------------------- Définition des classes --------------------------------//

// _ devant un fonction ou une variable : indiquer qu'ils sont conceptuellement plutôt privés
// assez moche et pas fort nécessaire ici... parfois pas toujours appliqué

//************************* Classe Createur *************************
// permet de raccourcir l'écriture de création d'éléments (même si moins performant, forcément)

class Createur {

    static elem(tag, param={}) {
        const el = document.createElement(tag);
        if ('id' in param) el.setAttribute('id', param.id);
        if ('texte' in param) el.appendChild(document.createTextNode(param.texte));
        if ('html' in param) el.innerHTML = param.html;
        if ('style' in param) el.setAttribute('style', param.style);
        if ('parent' in param) param.parent.appendChild(el);
        if ('enfants' in param) for (const enfant of param.enfants) el.appendChild(enfant);
        if ('classesHtml' in param) for (const classe of param.classesHtml) el.classList.add(classe);
        if ('attributs' in param) for (const attr of param.attributs) el.setAttribute(attr[0], attr[1]);
        if ('events' in param) {
            for (const event of param.events) {
                const bindingParams = [];
                const bindingElement = (('bindElement' in event) ? event.bindElement : el);
                bindingParams.push(bindingElement);
                if ('param' in event) bindingParams.push(...event.param);
                el.addEventListener(event.nom, event.fonction.bind(...bindingParams));
            }
        }
        return el;
    }
}

//************************* Classe Parchemin *************************
// contient les données liées à un parchemin, y compris ses glyphes

/* Exemple :
 {"id":"9308040",
 "nom":"Yeu'Ki'Pic Gribouillé",
 "effetDeBaseTexte":"Vue : -6 | PV : +6 D3 | Effet de Zone",
 "glyphes":[
 //, ...
 ],
 "complet":false,
 "potentiellementInteressant":true} */

// constructor(id, nom=undefined, effetDeBaseTexte=undefined, glyphes=[] )
// ajouterGlyphe(glyphe)
// effetTotal(glyphesRetires=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

class Parchemin {

    /**
     * @return {number}
     */
    static get NOMBRE_GLYPHES() { return 10; }

    constructor(id, nom=undefined, effetDeBaseTexte=undefined, glyphes=[] ) {
        this.id = id;
        this.nom = nom;
        this.effetDeBaseTexte = effetDeBaseTexte;
        this.complet = false;                             // considéré complet lorsque 10 glyphes
        this.glyphes = [];
        for (const g of glyphes) this.ajouterGlyphe(g);   // array d'objets Glyphes
    }

    ajouterGlyphe(glyphe) {
        if (glyphe.traitable) {
            this.glyphes.push(glyphe);
            if (this.glyphes.length === (Parchemin.NOMBRE_GLYPHES)) {
                this.complet = true;
            }
        }
    }

    effetTotal(glyphesRetires=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) {
        const total = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (const glyphe of this.glyphes.filter((x, i) => !(Boolean(glyphesRetires[i])))) {
            for (const [caracId, e] of Object.entries(glyphe.effet)) {
                total[Number(caracId)] += e;
            }
        }
        return total;
    }

}

//************************* Classe ParcheminEnPage *************************

// constructor(id, nom, effetDeBaseTexte, glyphes)
// get cochagesGlyphes
// get effetTotalHtml
// calculerCaracMax
// calculerValeurMax(carac, cocher=false)
// calculerCaracMin
// calculerValeurMin(carac, cocher=false)
// creerLignes(parent, position)
// _creerLigneEffetsGlyphes(parent, position)
// _creerLigneEffetTotal(parent)
// _creerLigneSeparation(parent)
// static _mettreEnFormeTd(td)
// supprimerParchemin()
// rafraichirEffetTotal()
// static creerParchemin(enregistrement)

// Parchemin dans une page html pour l'outil, crée et connait les éléments html correspondant
class ParcheminEnPage extends Parchemin {

    static get W_COL1() { return "10vw"};

    constructor(id, nom, effetDeBaseTexte, glyphes, garde=true) {
        super(id, nom, effetDeBaseTexte, glyphes);
        this.ligneEffetsGlyphes;    // TODO pas top ce système en trois ligne, trimballé du passé, à refactorer en un element
        this.ligneEffetTotal;
        this.tdEffetTotal;
        this.ligneSeparation;
        this.potentiellementInteressant = garde; // pour l'afficher ou non dans l'outil
    }

    get cochagesGlyphes() {
        return this.glyphes.map(g => Number(g.coche));
    }

    // todo ou alors je pourrais créer des nodes, plus propre...
    // A voir : affiche volontairement les durées négatives des durées (ême si équivalent 0), plus clair pour composer
    // pour effet de zone n'affiche quand même pas 0 ou négatif pour bien marquer différence
    get effetTotalHtml() {
        const total = this.effetTotal(this.cochagesGlyphes);
        const totalHtml = [];
        for (let i = 0; i < total.length; i++) {
            if (total[i] == 0 && i != DUREE) continue;                  // pas d'effet, sauf pour Durée où on affiche
            if ((total[i] <= 0) && i == ZONE) continue;   // pas d'efet de zone
            let s = '';
            const bonus = ((i === TOUR) ? -1 : +1);
            let couleur = (((total[i] * bonus) > 0) ? COULEUR_BONUS : COULEUR_MALUS );
            if (i === DUREE || i == ZONE ) couleur = COULEUR_AUTRE;
            if (i === DUREE && ((total[i] > 1) || (total[i] < -1))) s = 's';

            let html = `<span style="color:${couleur};font-weight:bold">`;
            html += CARAC[i].presentation + " : " + (total[i] > 0 ? '+' : '') + total[i] + ' ' + CARAC[i].unite[1] + s;
            html += "</span>";
            totalHtml.push(html);
        }
        return totalHtml.join(" | ");
    }

    calculerCaracMax() {
        const valeursMax = [];
        for(let i = 0; i < 10; i++) {
            if (i != ZONE) {
                valeursMax.push(this.calculerValeurMax(i, false));
            }
            else {
                valeursMax.push(-Infinity);
            }
        }
        return valeursMax.indexOf(Math.max(...valeursMax));
    }

    calculerValeurMax(carac, cocher=false) {
        // d'abord fait en reducer mais pas aussi lisible...
        let max = 0;
        for (const g of this.glyphes) {
            if (!g.estSansEffet) {
                for (let i = 0; i < g.caracteristiques.length; i++) {

                    if (g.caracteristiques[i].id == carac) {
                        if (ORIENTATIONS_GLYPHES[g.orientation].impact[i] > 0) {
                            max += (g.puissance - i);
                            break;                    // si le premier est de la carac, le second ne le sera pas...
                        }
                        if (ORIENTATIONS_GLYPHES[g.orientation].impact[i] < 0) {
                            if (!((i == 1 && g.puissance == 1)) )  // si la valeur n'est pas 0 (deuxième carac à très gras)
                                if (cocher) g.cocher();            // la mise à jour du total se fait lors de l'affichage
                            break;
                        }
                    }
                }
            }
        }
        displayDebug('calculerValeurMax / parchemin : ' + this.id + " / carac : " + carac + " / valeur : " + max);
        return max;
    }

    calculerCaracMin() {
        const valeursMin = [];
        for(let i = 0; i < 10; i++) {
            if (i != ZONE) {
                valeursMin[i] = this.calculerValeurMin(i, false);
            }
            else {
                valeursMin[i] = Infinity;
            }
        }
        return valeursMin.indexOf(Math.min(...valeursMin));
    }

    calculerValeurMin(carac, cocher=false) {
        let min = 0;
        for (const g of this.glyphes) {
            if (!g.estSansEffet) {
                for (let i = 0; i < g.caracteristiques.length; i++) {
                    if (g.caracteristiques[i].id == carac) {
                        if (ORIENTATIONS_GLYPHES[g.orientation].impact[i] < 0) {
                            min -= (g.puissance - i);  // attention deuxième carac -1 en puissance
                        }
                        else if (ORIENTATIONS_GLYPHES[g.orientation].impact[i] > 0) {
                            if (!((i == 1 && g.puissance == 1)) )
                                if (cocher) g.cocher();
                            //break;
                        }
                    }
                }
            }
        }
        displayDebug('calculerValeurMin / parchemin : ' + this.id + " / carac : " + carac + " / valeur : " + min);
        return min;
    }

    creerLignes(parent, position) {
        this.ligneEffetsGlyphes = this._creerLigneEffetsGlyphes(parent, position);
        this.ligneEffetTotal = this._creerLigneEffetTotal(parent);
        this.ligneSeparation = this._creerLigneSeparation(parent);
    }

    _creerLigneEffetsGlyphes(parent, position) {
        const trEffetsGlyphes = Createur.elem('tr', { parent: parent });
        const boutonSupprimer = Createur.elem('button', {
            id: this.id + '-supprimer',
            attributs: [['title', 'Supprimer ce parchemin']],
            enfants: [document.createTextNode('X')],
            events: [{ nom: 'click', fonction: this.supprimerParchemin, bindElement: this }],
            classesHtml: ['mh_form_submit'] });

        Createur.elem('td', {                                     // si besoin de nom : const tdIdParchemin
            attributs: [['title', this.effetDeBaseTexte]],
            parent: trEffetsGlyphes,
            style: "width: " + ParcheminEnPage.W_COL1,
            enfants: [boutonSupprimer, document.createTextNode('[' +  (position + 1) + ']  ' + this.id)] });

        const tdEffetsGlyphes = Createur.elem('td', { parent: trEffetsGlyphes });
        const tableEffetsGlyphes = Createur.elem('table', { id: this.id, parent: tdEffetsGlyphes });
        const trcheckboxGlyphes = Createur.elem('tr', { parent: tableEffetsGlyphes });
        const trDetailsEffetsGlyphes = Createur.elem('tr', { parent: tableEffetsGlyphes });

        // bien mais plus lent ? :) for (const [i, glyphe] of parchemin.glyphes())
        for(let i = 0; i < this.glyphes.length; i++) {
            const thGlyphe = this.glyphes[i].creerThCheckboxGlyphe(this, i);
            trcheckboxGlyphes.append(thGlyphe);
            const tdGlyphe = this.glyphes[i].creerTdEffetGlyphe(this.id + '-glyphe-' + i);
            trDetailsEffetsGlyphes.append(tdGlyphe);
        }
        return trEffetsGlyphes;
    }

    _creerLigneEffetTotal(parent) {
        const trEffetTotal = Createur.elem('tr', { parent: parent });
        const tdNomParchemin = Createur.elem('td', {
            texte : this.nom,
            attributs: [['title', this.effetDeBaseTexte]],
            style: "width: " + ParcheminEnPage.W_COL1,
            parent: trEffetTotal });
        ParcheminEnPage._mettreEnFormeTd(tdNomParchemin);
        this.tdEffetTotal = Createur.elem('td', { id: this.id + "-effet", html: this.effetTotalHtml, parent: trEffetTotal });
        ParcheminEnPage._mettreEnFormeTd(this.tdEffetTotal);
        return trEffetTotal;
    }

    _creerLigneSeparation(parent) {                                   // potentiellement static ...
        const trSeparation = Createur.elem('tr', { parent: parent });
        const tdTirets = Createur.elem('td', {
            texte: '------------------',
            style: "width: " + ParcheminEnPage.W_COL1,
            parent : trSeparation });
        ParcheminEnPage._mettreEnFormeTd(tdTirets);
        return trSeparation;
    }

    static _mettreEnFormeTd(td) {
        td.style.padding = '15px'; // TODO trouver mieux et utiliser constantes
    }

    // this est le parchemin, même si appelé depuis le bouton
    supprimerParchemin() {
        this.ligneEffetsGlyphes.style.display = 'none';
        this.ligneEffetTotal.style.display = 'none';
        this.ligneSeparation.style.display = 'none';
        this.potentiellementInteressant = false;
    }

    rafraichirEffetTotal() {
        this.tdEffetTotal.innerHTML = this.effetTotalHtml;
    }

    static creerParchemin(enregistrement) {
        const nouveauxGlyphes = [];
        for (const [i, numero] of Object.entries(enregistrement.glyphesNumeros)) {
            nouveauxGlyphes.push(new GlypheEnPage(numero, enregistrement.glyphesCoches[i]));
        }
        return new ParcheminEnPage(enregistrement.id, enregistrement.nom, enregistrement.effetDeBaseTexte, nouveauxGlyphes, enregistrement.garde);
    }
}

//************************* Classe Glyphe *************************
// Est-ce que le #pour les champs privés déjà en place ?
// Est-ce que le lazy getter est implémenté maintenant ?
// tous est final figé ici une fois contruit, donc je calcule tout une fois au début

/* Exemple :
 {"numero":"56593",
 "_numeroUtilise":"56592",
 "_debutFamille":56584,
 "_repereCaracteristiques":56616,
 "caracteristiques":[
 {"id":4,
 "presentation":"Vue",
 "unite":[1,""]},
 {"id":3,
 "presentation":"REG",
 "unite":[1,""]}],
 "finesse":1,
 "orientation":0,
 "traitable":true,
 "effet":{"3":1,"4":-2},
 "effetTexte":"Vue : -2  REG : +1 ",
 "detailsTexte":"Gribouillage : 56593\nFinesse : 1 [Gras] / Puissance : 2\nOrientation : 0 [Malus | Bonus, Initiale]\nCaractéristique 1 : Vue / Caractéristique 2 : REG\nEffet du glyphe : Vue : -2  REG : +1 ",
 "effetHtml":"<span style=\"color:#990000;font-weight:bold\">Vue : -2 </span><br><span style=\"color:#336633;font-weight:bold\">REG : +1 </span>"} */

// constructor(numero)
// _analyserGlyphe()
// static _calculerNumeroUtilise(numero)
// static _calculerDebutFamille(numero)
// static _calculerFinesse(numero, debutFamille)
// static _calculerOrientation(numero, debutFamille)
// determinerSiTraitable()
// calculerEffet()
// composerEffetTexte()
// composerDetailsTexte()
// get puissance
// get estSansEffet

class Glyphe {

    static get NUMERO_DEBUT() { return 1288; }
    static get INTERVALLE() { return 1024; }

    constructor(numero) {
        this.numero = numero;
        this.caracteristiques;
        this.orientation;
        this.finesse;
        this.effet;
        this.effetTexte;
        this.detailsTexte;
        this.traitable;

        // champs qui ne varient pas, pour éviter de les recalculer
        this._numeroUtilise;
        this._debutFamille;
        this._repereCaracteristiques;
        // this._dejaGratte = false; glyphes inconnus non traités pour le moment

        this._analyserGlyphe();
    }

    _analyserGlyphe() {
        this._numeroUtilise = Glyphe._calculerNumeroUtilise(this.numero);
        this._debutFamille = Glyphe._calculerDebutFamille(this._numeroUtilise);
        this._repereCaracteristiques = this._debutFamille + 32;
        this.caracteristiques = CARACTERISTIQUES_GLYPHES[this._repereCaracteristiques];
        this.finesse = Glyphe._calculerFinesse(this._numeroUtilise, this._debutFamille);
        this.orientation = Glyphe._calculerOrientation(this._numeroUtilise, this._debutFamille);
        this.traitable = this.determinerSiTraitable();
        if (this.traitable) {
            this.effet = this.calculerEffet();
            this.effetTexte = this.composerEffetTexte();
            this.detailsTexte = this.composerDetailsTexte();
        }
    }

    static _calculerNumeroUtilise(numero) {
        // Si le numéro est impair, on utilise le numéro pair le précédant
        return numero % 2 ? String(Number(numero) - 1) : numero;
    }

    static _calculerDebutFamille(numero) {
        return (parseInt((numero - Glyphe.NUMERO_DEBUT) / Glyphe.INTERVALLE) * Glyphe.INTERVALLE) + Glyphe.NUMERO_DEBUT;
    }

    static _calculerFinesse(numero, debutFamille) {
        return parseInt((numero - debutFamille) / 8);
    }

    static _calculerOrientation(numero, debutFamille) {
        return ( (numero - debutFamille) / 2 ) % 4;
    }

    determinerSiTraitable() {
        if (this.numero < Glyphe.NUMERO_DEBUT) return false;
        if (!(this._repereCaracteristiques in CARACTERISTIQUES_GLYPHES)) return false;
        if (!(this.finesse in FINESSES_GLYPHES)) return false;
        return true;
    }

    calculerEffet() {
        let valeur1;
        let valeur2;

        // sans effet lorsque les deux caracs sont les mêmes
        if (CARAC[this.caracteristiques[0].id] === CARAC[this.caracteristiques[1].id]) {
            valeur1 = 0;
            valeur2 = 0;
        }
        else {
            const signe1 = ORIENTATIONS_GLYPHES[this.orientation].impact[0];
            const puissance1 = this.puissance;
            const unite1 = CARAC[this.caracteristiques[0].id].unite[0];
            const signe2 = ORIENTATIONS_GLYPHES[this.orientation].impact[1];
            const puissance2 = this.puissance - 1;
            const unite2 = CARAC[this.caracteristiques[1].id].unite[0];
            // [{id:, present:, unite}]

            valeur1 = signe1 * puissance1 * unite1;
            valeur2 = signe2 * puissance2 * unite2;
        }

        const caracs = {};
        caracs[this.caracteristiques[0].id] = valeur1;
        caracs[this.caracteristiques[1].id] = valeur2;

        return caracs;
    }

    composerEffetTexte() {
        const textes = [];

        // TODO chrome trie les indice numériques des objets par défaut comme effet... flemme de changer en array ou autre, donc parcourt de l'array carac
        for (const id of this.caracteristiques.map(x => x.id)) {
            if (this.effet[id] != 0) {
                switch (Number(id)) {
                    case DUREE :
                        const s = ((this.effet[id] > 1) || (this.effet[id] < -1)) ? 's' : '';
                        textes.push(CARAC[id].presentation + " : " + (this.effet[id] > 0 ? '+' : '') + this.effet[id] + ' ' + CARAC[id].unite[1] + s);
                        break;
                    default :
                        textes.push(CARAC[id].presentation + " : " + (this.effet[id] > 0 ? '+' : '') + this.effet[id] + ' ' + CARAC[id].unite[1]);
                }
            }
        }

        if (textes.length === 0) textes.push("Sans effet");
        return textes.join(' ');
    }

    composerDetailsTexte() {
        const details =
            `Gribouillage : ${this.numero}
Finesse : ${this.finesse} [${FINESSES_GLYPHES[this.finesse]}] / Puissance : ${this.puissance}
Orientation : ${this.orientation} [${ORIENTATIONS_GLYPHES[this.orientation].impactTexte}, ${ORIENTATIONS_GLYPHES[this.orientation].nom}]
Caractéristique 1 : ${this.caracteristiques[0].presentation} / Caractéristique 2 : ${this.caracteristiques[1].presentation}
Effet du glyphe : ${this.effetTexte}`;
        return details;
    }

    get puissance() {
        return Math.min(5, this.finesse + 1);
    }

    get estSansEffet() {
        return this.caracteristiques[0].id === this.caracteristiques[1].id;
    }

}


// constructor(numero, coche=false)
// constructor(numero)
// creerTdEffetGlyphe(id)
// creerThCheckboxGlyphe(parchemin, positionGlyphe)
// traiterCheckboxGlyphe(glyphe, parchemin)
// composerEffetHtml()

//************************* Classe GlypheEnPage *************************
class GlypheEnPage extends Glyphe {

    static get W_EFF() { return "7vw"};

    constructor(numero, coche=false) { // td, parcheminEnPage
        super(numero);
        this.coche = coche;
        this.tdEffet; // = td;
        this.checkbox;
        //this.parcheminEnPage; // = parcheminEnPage;
        this.effetHtml = this.composerEffetHtml();
    }

    //static element(tag, id, texteContenu, classes=[], attributs=[], parent, enfants=[])
    creerTdEffetGlyphe(id) {
        this.tdEffet = Createur.elem('td', {
            id: id,
            html: this.effetHtml,
            style: "padding:5px; text-align:center; width:" + GlypheEnPage.W_EFF,
            attributs: [['title', this.detailsTexte]] });
        if (this.coche) this.cocher();
        return this.tdEffet;
    }

    creerThCheckboxGlyphe(parchemin, positionGlyphe) {
        let th = Createur.elem('th');
        this.checkbox = Createur.elem('input', {
            id: parchemin.id + '-checkbox-' + positionGlyphe,
            attributs: [['type', 'checkbox']],
            parent: th,
            events: [{ nom: 'change', fonction: this.traiterCheckboxGlyphe, bindElement: this, param: [parchemin]}] });
        let span = Createur.elem('span', { texte: ('glyphe ' + (positionGlyphe+1)), parent: th });
        if (this.coche) this.cocher();
        return th;
    }

    traiterCheckboxGlyphe(parchemin) {
        if (this.checkbox.checked) {
            this.cocher();
        }
        else {
            this.decocher();
        }
        parchemin.rafraichirEffetTotal();
    }

    // moyen de faire plus propre, générique, scindé, similaire/compatible avec parchemin... mais bon. :)
    composerEffetHtml() {
        let textes = [];

        // TODO chrome trie les indice numériques des objets par défaut comme effet... flemme de changer en array ou autre, donc parcourt de l'array carac
        for (const id of this.caracteristiques.map(x => x.id)) {
            if (this.effet[id] != 0) {

                let bonus = ((id == TOUR) ? -1 : +1);
                let couleur = (((this.effet[id] * bonus) > 0) ? COULEUR_BONUS : COULEUR_MALUS );
                if (id === DUREE || id == ZONE ) couleur = COULEUR_AUTRE;
                let html = `<span style="color:${couleur};font-weight:bold;white-space: nowrap">`;
                let s = (id === DUREE && ((this.effet[id] > 1) || (this.effet[id] < -1))) ? 's' : '';
                // vestige... gare au type de id tout de même... switch (Number(id)) {    case DUREE :

                html +=CARAC[id].presentation + " : " + (this.effet[id] > 0 ? '+' : '') + this.effet[id] + ' ' + CARAC[id].unite[1] +s;
                html += "</span>";
                textes.push(html);
            }
        }

        if (textes.length === 0) textes.push("Sans effet");
        return textes.join('<br>');
    }

    cocher() {
        this.coche = true;
        if (this.checkbox) this.checkbox.checked = true;
        if (this.tdEffet) this.tdEffet.style.opacity = 0.25;

    }

    decocher() {
        this.coche = false;
        if (this.checkbox) this.checkbox.checked = false;
        if (this.tdEffet) this.tdEffet.style.opacity = 1;
    }

    //static creerGlyphe(glyphe) {}


}

//************************* Classe Recuperateur *************************

// constructor (demandeur)
// static appelerServiceHtml(appelant, type, url, callbackHtml, parametres=[], inputs=[])
// vaChercherParchemins()
// _extraireParchemins(reponseHtml)
// vaChercherGlyphes(parcheminId)
// _grattageAllerEtapeDeux(reponseHtml, parcheminId)
// _extraireGlyphes(reponseHtml, parcheminId)

// récupère les glyphes et les parchos
class Recuperateur {

    static get URL_GRATTAGE_1() { return "https://games.mountyhall.com/mountyhall/MH_Play/Actions/Play_a_Competence.php?ai_IdComp=26&ai_IDTarget="; }
    static get URL_GRATTAGE_2() { return "https://games.mountyhall.com/mountyhall/MH_Play/Actions/Competences/Play_a_Competence26b.php"; }

    constructor (demandeur) {
        this.demandeur = demandeur;
    }

    static appelerServiceHtml(appelant, type, url, callbackHtml, parametres=[], inputs=[]) {
        const xhr = new XMLHttpRequest();
        xhr.open(type, url);
        xhr.onload = function () {
            const parser = new DOMParser();
            const reponseHtml = parser.parseFromString(this.responseText, "text/html");
            callbackHtml.call(appelant, reponseHtml, ...parametres);
        };
        xhr.send(...inputs);

        //Attention ancienne "mauvaise solution.
        // Je me demandais ce qui serait le plus performant entre un DomParser et un innerHTML
        //Avantage du domparser : il ne fait pas les requêtes pour les images au serveur !
        //let htmlResponse = document.createElement('div');
        //htmlResponse.innerHTML = this.responseText;
    }

    vaChercherParchemins() {
        displayDebug("vaChercherParchemins");
        // appelle la page de grattage MH pour en extraire les parchemins grattables
        Recuperateur.appelerServiceHtml(this, "GET", Recuperateur.URL_GRATTAGE_1, this._extraireParchemins);
    }

    // récupère les parchemins grattables, les instancie, puis appelle le traitement pour les analyser
    _extraireParchemins(reponseHtml) {
        displayDebug("_extraireParchemins : ")
        //displayDebug(reponseHtml.querySelector('body').innerHTML);
        const parcheminsRecuperes = [];
        for (const option of reponseHtml.querySelectorAll('optgroup option')) {
            const nomParchemin = option.innerHTML.split(' - ')[1];
            const parchemin = new Parchemin(option.value, nomParchemin);
            parcheminsRecuperes.push(parchemin);
        }
        this.demandeur.recevoirParcheminsInfosBase(parcheminsRecuperes);
    }


    // appelle derrière la première page du grattage, puis la seconde pour le parchemin pour récupérer les glyphes
    vaChercherGlyphes(parcheminId) {
        Recuperateur.appelerServiceHtml(this, "GET", Recuperateur.URL_GRATTAGE_1, this._grattageAllerEtapeDeux, [parcheminId]);
    }

    // ... d'où on appelle la seconde page de grattage ...
    _grattageAllerEtapeDeux(reponseHtml, parcheminId) {

        const inputs = new FormData(reponseHtml.querySelector('#ActionForm'));
        inputs.set('ai_IDTarget', parcheminId);

        Recuperateur.appelerServiceHtml(this, "POST", Recuperateur.URL_GRATTAGE_2, this._extraireGlyphes, [parcheminId], [inputs]);
    }

    // ... d'où on récupère les glyphes pour les fournir au demandeur
    _extraireGlyphes(reponseHtml, parcheminId) {
        const parcheminPourComposition = new Parchemin(parcheminId);
        parcheminPourComposition.effetDeBaseTexte = reponseHtml.querySelectorAll('td')[2].innerHTML;
        for (const image of reponseHtml.querySelectorAll(".l_grib1")) {
            const glyphe = new Glyphe(image.src.split('Code=')[1]);
            parcheminPourComposition.ajouterGlyphe(glyphe);
        }
        this.demandeur.recevoirParcheminInfosComposition(parcheminPourComposition);
    }
}



//************************* Classe OutilListerGrattage *************************

// constructor(parent)
// chargerDepuisHall()
// construireIndex(index=this.parchemins)
// recevoirParcheminsInfosBase(parcheminsRecus)
// _appelerRechercherGlyphes(position)
// recevoirParcheminInfosComposition(parcheminRecu)
// reinitialiserChoix(interessant, cochages)
// afficherTousParchemins()
// afficherParcheminsGardes()
// afficherParcheminsFiltres()
// _afficherParchemin(parchemin, position)
// nettoyerParchemins()
// afficherRecapitulatif()
// _preparerPageListe()
// _attacherMessageIntro()
// _attacherBoutonsChargement()
// _attacherInterfaceSupprimerParchemins()
// _attacherInterfaceRecapituler()
// _attacherInterfaceFiltrer()
// _attacherTableParchemins()
// viderTableParchemins()
// exporterParchemins()
// importerParchemins(sauvegarde)
// chargerLocalement()
// sauvegarderLocalement()

// TODO exploser la classe en plusieurs, elle fait trop de choses
class OutilListerGrattage {
    constructor(parent) {
        this.parent = parent;
        this.zone;
        this.parchemins = [];
        this.incomplets = [];
        this.filtre = {};
        this.zoneDateEnregistrement;
        this.texteRecapitulatif;
        // index pour connaitre ordre dans lequel afficher les parchemins, liste de positions (par rapport à this.parchemin)
        // pour le moment il n'y a pas de raison vraiment convaincante à ne jamais toucher directement à l'ordre initial de this.parchemins ?
        this.index = [];
        // idéalement une classe pour la gui, mais ici c'est encore restreint
        this.table;
        this._preparerPageListe();

        if (STATIQUE) {
            this.importerParcheminsEtAfficher(JSON.parse(SAUVEGARDE));
        }
        else {
            this.chargerLocalement();
        }
    }

    construireIndex(listeParchemins=this.parchemins) {
        this.index = listeParchemins.map((p, i) => i) ;
    }

    chargerDepuisHall() {
        // à mettre après préparation pour pouvoir table déjà créée ?
        this.viderTableParchemins();
        this.viderTexteRecapitulatif();
        this.index = [];
        this.recuperateur = new Recuperateur(this);
        this.recuperateur.vaChercherParchemins();
        this.zoneDateEnregistrement.innerText = "Moment du chargement : " + new Date().toLocaleString();
    }

    // recoit les id/nom des parchemins du recuperateur (pourrait les recevoir un à un, intérêt ici ?)
    // ensuite enclenche les appels pour recuperer les glyphes
    recevoirParcheminsInfosBase(parcheminsRecus) {
        displayDebug("recevoirParcheminsInfosBase");
        displayDebug(parcheminsRecus);
        this.parchemins =  parcheminsRecus.map(p => new ParcheminEnPage(p.id, p.nom));
        this.construireIndex(parcheminsRecus);

        // Attention requêtes pour les glyphes des différents parchemins les unes à la suite des autres, ne doivent pas se chevaucher
        compteurSecuriteNombreAppels = 0;
        this._appelerRechercherGlyphes(0);
    }

    _appelerRechercherGlyphes(position) {
        if (compteurSecuriteNombreAppels++ > MAX_APPELS) return; // empêcher un trop gros nombre d'appels au serveur
        if ((position < this.parchemins.length) ) this.recuperateur.vaChercherGlyphes(this.parchemins[position].id);
        else {
            displayDebug("fin _appelerRechercherGlyphes, nombre : " + this.parchemins.length);
            if (EXPORTER_PARCHEMINS) { // pour récupérer les parchemins et travailler en local
                console.log(JSON.stringify(this.exporterParchemins()));
            }
        }
    }

    // recoit les effets de base/Glyphes d'un parchemin du recuperateur
    // provoque l'affichage et fait l'appel pour le parchemin suivant
    recevoirParcheminInfosComposition(parcheminRecu) {
        displayDebug("recevoirParcheminInfosComposition : " + parcheminRecu.id);
        // TODO renvoyer des parchemins 'pas complètement remplis' aux recevoirxxx permettait d'utiliser une structure existante,
        // TODO mais un peu lourdingue de recréer les objets enPage (et recalculs pour glyphes surtout !...) et de devoir retrouver le parchemin correspondant équivalent
        // TODO Pptions : recevoirxxx avec juste les données nécessaires ? recoivent et complètent les vrais parchemins (solution initiale...)?
        // TODO Créent des xxxEnPage même si étrange ? Trouver comment caster efficacement du parent -> enfant en js ?

        const position = this.parchemins.findIndex(x => x.id === parcheminRecu.id);
        const parcheminEnPage = this.parchemins[position];
        parcheminEnPage.effetDeBaseTexte = parcheminRecu.effetDeBaseTexte;
        for (const glyphe of parcheminRecu.glyphes) {
            parcheminEnPage.ajouterGlyphe(new GlypheEnPage(glyphe.numero));
        }

        displayDebug('------------------------------------------------');
        displayDebug(parcheminEnPage);
        //displayDebug(JSON.stringify(parcheminEnPage));

        // si le parchemin n'est pas traitable/complet, on l'affiche quand même avec glyphes manquants [old : le retire directement]
        if (!parcheminEnPage.complet) {
            this.incomplets.push(parcheminEnPage.id + " " + parcheminEnPage.nom);
            displayDebug("parchemin incomplet : " + parcheminEnPage.id + " " + parcheminEnPage.nom);
            //this.parchemins.splice(position, 1);
            //this._appelerRechercherGlyphes(position) ;
        }
        //else {
        //    this._appelerRechercherGlyphes(position + 1) ;
        //    this._afficherParchemin(parcheminEnPage, position);
        //}

        this._appelerRechercherGlyphes(position + 1) ;
        this._afficherParchemin(parcheminEnPage, position);

        // après avoir reçu des glyphes d'un parchemin à traiter, on fait la requête pour le parchemin suivant
        // TODO A quel point plus lourd de retrouver l'indice ? convertir en dict pour parchemins... ?G?
        // TODO Ou garder simplement indice en mémoire ? D'autant plus que j'ai déjà le compteur de securite en globale ! :D

    }


    reinitialiserChoix(interessant, cochages) {
        for (const p of this.parchemins) {
            if (interessant) p.potentiellementInteressant = true;
            if (cochages) {
                for(const g of p.glyphes) {
                    g.decocher();
                }
            }
        }
    }

    // TODO fournir en parametres un index de l'ordre des parchemins pour l'utiliser de manière universelle, avec le tri aussi
    afficherTousParchemins() {
        this.viderTableParchemins();
        for (let i = 0; i < this.index.length; i++) {        // attention index
            this._afficherParchemin(this.parchemins[this.index[i]], i);
        }
    }

    // TODO : un peu bizarre... le i affiche correspond au parchemin dans l'array ? Pour filtre pas comme ça je crois
    afficherParcheminsGardes() {
        this.viderTableParchemins();
        for (let i = 0; i < this.index.length; i++) {
            if (this.parchemins[this.index[i]].potentiellementInteressant) {
                this._afficherParchemin(this.parchemins[this.index[i]], i);
            }
        }
    }

    afficherParcheminsFiltres() {
        displayDebug("afficherParcheminsFiltres");
        // choix de reinitialiser pour pouvoir cocher les options les plus puissantes et voir rapidement l'interet
        // laisser les cochages de l'utilisateur aussi peut être inétressant (et demander moins de progra. ;) ), j'ai fait comme je préfère
        this.reinitialiserChoix(true, true);
        const type = this.filtre.type.value;
        const puissance = Number(this.filtre.puissance.value);
        const carac = Number(this.filtre.carac.value);
        const zone = this.filtre.zone.checked;
        let parcheminsATrier = [];

        for(const [i, p] of Object.entries(this.parchemins)) {
            let garde = true;
            let valeur = ((type == AU_MOINS) ? -Infinity : Infinity); // besoin d'initialiser pour que le tri fonctionnne

            if (zone) {
                if (p.calculerValeurMax(ZONE, false) <= 0) garde = false; // pourrait mettre à true si on veut coher pour un max effet de zone
            }

            if (garde) {
                if (type == AU_MOINS) {
                    if(carac == TOUTES) {
                        const caracMax = p.calculerCaracMax();
                        valeur = p.calculerValeurMax(caracMax, true);
                    }
                    else {
                        valeur = p.calculerValeurMax(carac, true);
                    }
                    if (valeur < puissance) garde = false;
                }
                else if (type == AU_PLUS) {
                    if(carac == TOUTES) {
                        const caracMin = p.calculerCaracMin();
                        valeur = p.calculerValeurMin(caracMin, true);
                    }
                    else {
                        valeur = p.calculerValeurMin(carac, true);
                    }
                    if (valeur > puissance) garde = false;
                }
            }
            p.potentiellementInteressant = garde;
            //if (garde) // je les mets tous pour créer index complet, tri plus lourd évidemment, à tester
            parcheminsATrier.push([i, valeur]);
        }

        if (type == AU_MOINS) parcheminsATrier.sort((v1, v2) => (v2[1] - v1[1])); // TODO tri secondaire prédéfini, par exemple tours, dégats, ...
        else if (type == AU_PLUS) parcheminsATrier.sort((v1, v2) => (v1[1] - v2[1]));
        this.index = parcheminsATrier.map(x => x[0]);

        this.afficherParcheminsGardes();
        //this.viderTableParchemins();
        //for (let i = 0; i < parcheminsATrier.length; i++) {
        //    this._afficherParchemin(parcheminsATrier[i][0], i);
        //}
    }

    // volontaire ici aussi d'appeler et d'afficher un à un petit à petit dans la dom,
    // plus lourd au total mais visuellement plus direct si beaucoup de parchemins.
    _afficherParchemin(parchemin, position) {
        parchemin.creerLignes(this.table, position);
    }

    nettoyerParchemins() {
        const parcheminsASupprimer = document.getElementById('parcheminsASupprimer').value.replace(/\s/g, "").split(','); //enlève les blancs et espaces
        for (const p of this.parchemins) {
            if (parcheminsASupprimer.includes(p.id)) p.supprimerParchemin();
        }
    }

    afficherRecapitulatif() {
        const htmlParcheminsModifies = [];
        const htmlParcheminsNonModifies = [];
        const parcheminsIdModifies = [];
        const parcheminsIdSupprimes = [];

        for (let i = 0; i < this.index.length; i++) {
            const p = this.parchemins[this.index[i]];
            if (!p.potentiellementInteressant) {
                parcheminsIdSupprimes.push(p.id);
            }
            else {
                const cochages = p.cochagesGlyphes;
                let cochagesTexte = "grattages : aucun";
                if (cochages.includes(1))  cochagesTexte = "<strong>grattages : " + cochages.map((x, i) => (Boolean(x) ? (i + 1) : '')).join(" ") + "</strong>";
                const html = `<p><strong>${p.id}</strong> - ${p.nom} <em>${p.effetDeBaseTexte}</em> : ${cochagesTexte} => ${p.effetTotalHtml}</p>`;

                if (cochages.includes(1)) {
                    htmlParcheminsModifies.push(html);
                    parcheminsIdModifies.push(p.id);
                }
                else htmlParcheminsNonModifies.push(html);
            }
        }

        let reponse = '<p><strong style="color:darkgreen">Parchemins cochés :</strong> ' + (parcheminsIdModifies.length ? parcheminsIdModifies.join(', ') : 'aucun') + '</p>';
        reponse += '<p><strong style="color:orangered">Parchemins rejetés :</strong> ' + (parcheminsIdSupprimes.length ? parcheminsIdSupprimes.join(', ') : 'aucun') + '</p>';
        reponse += '<p><strong style="color:darkgreen">Détails parchemins cochés :</strong> ' + (htmlParcheminsModifies.length ? htmlParcheminsModifies.join('') : 'aucun') + '</p>';
        reponse += '<p><strong style="color:dimgrey">Détails parchemins inchangés :</strong> ' + (htmlParcheminsNonModifies.length ? htmlParcheminsNonModifies.join('') : 'aucun') + '</p>';

        this.texteRecapitulatif.innerHTML = reponse;
    }


    // Prépare l'interface de l'outil
    _preparerPageListe() {
        displayDebug("_preparerPageListe");
        if (!this.parent) {
            this.parent = document.getElementsByTagName('body')[0];
            this.parent.innerHTML = "";
        }
        this.zone = Createur.elem('div', { id: "listerGrattages", style: "padding:20px", parent: this.parent });

        this._attacherMessageIntro();
        this._attacherBoutonsChargement();
        this._attacherInterfaceSupprimerParchemins();
        this._attacherInterfaceRecapituler();
        this._attacherInterfaceFiltrer();
        this._attacherTableParchemins();

        displayDebug("fin _preparerPageListe");
    }

    _attacherMessageIntro() {
        this.zone.innerHTML =
            '<p>Pour que l\'outil fonctionne, vous devez être <strong>connecté</strong> à Mountyhall et disposer de <strong>au moins 2 PA</strong>.<br>' +
            'Lors d\'un appel au Hall, pour chaque parchemin sur vous, vous ferez 2 appels au serveur mountyhall. Utilisez cet outil de manière responsable.<br>' +
            'Non testé avec des parchemins "spéciaux". (mission, sortilège...)<br>' +
            'Survolez avec la souris les noms des parchemins pour voir les effets initiaux. Survolez les glyphes pour voir les détails.</p>';
    }

    _attacherBoutonsChargement() {
        const divBoutonsChargement = Createur.elem('div', { parent: this.zone, style: "margin:0vmin; padding:0.1vmin; border:solid 0px black" });

        Createur.elem('button', {                        // boutonSauvegarderLocalement
            texte : 'Sauvegarder (dans navigateur)',
            style: "margin: 10px 5px 10px 10px; background-color: #0074D9", // bleu
            parent: divBoutonsChargement,
            events: [{nom: 'click', fonction: this.sauvegarderLocalement, bindElement: this}],
            classesHtml: ['mh_form_submit'] });

        Createur.elem('button', {                       // boutonChargerLocalement
            texte : 'Charger (depuis navigateur)',
            style: "margin: 10px 20px 10px 5px",
            parent: divBoutonsChargement,
            events: [{nom: 'click', fonction: this.chargerLocalement, bindElement: this}],
            classesHtml: ['mh_form_submit'] });

        Createur.elem('button', {                       // boutonChargerLocalement
            texte : 'Importer (texte)',
            style: "margin: 10px 5px 10px 20px",
            parent: divBoutonsChargement,
            events: [{nom: 'click', fonction: this.validerImport, bindElement: this}],
            classesHtml: ['mh_form_submit'] });

        Createur.elem('button', {                       // boutonChargerLocalement
            texte : 'Exporter (texte)',
            style: "margin: 10px 20px 10px 5px",
            parent: divBoutonsChargement,
            events: [{nom: 'click', fonction: this.afficherExport, bindElement: this}],
            classesHtml: ['mh_form_submit'] });

        if (!STATIQUE) {
            Createur.elem('button', {                        // boutonchargerDepuisHall
                texte: 'Charger depuis votre inventaire (Hall)',
                style: "margin: 10px 20px 10px 20px; background-color: #FF851B", //orange
                parent: divBoutonsChargement,
                events: [{nom: 'click', fonction: this.chargerDepuisHall, bindElement: this}],
                classesHtml: ['mh_form_submit']
            });
        }
        else {
            Createur.elem('button', {                        // boutonchargerDepuisHall
                texte: 'Charger depuis votre inventaire (Hall)',
                style: "margin: 10px 20px 10px 20px; background-color: #AAAAAA", // gris
                parent: divBoutonsChargement,
                attributs: [['disabled', 'true']],
                events: [{nom: 'click', fonction: this.chargerDepuisHall, bindElement: this}],
                classesHtml: ['mh_form_submit']
            });
        }

        this.zoneDateEnregistrement = Createur.elem('span', { style: "margin: 10px", parent: divBoutonsChargement });
    }

    _attacherInterfaceSupprimerParchemins() {
        const divParcheminsASupprimer = Createur.elem('div', { parent: this.zone, style: "margin:1vmin; padding:1vmin; border:solid 1px black" });

        this.boutonSupprimerParchemins = Createur.elem('button', {             // moué, this un peu facile pour faire paser un truc...
            texte : 'Supprimer parchemins',
            style: "margin: 10px",
            parent: divParcheminsASupprimer,
            events: [{nom: 'click', fonction: this.nettoyerParchemins, bindElement: this}],
            classesHtml: ['mh_form_submit'] });

        Createur.elem('input', {              // si besoin de nom : const inputParcheminsASupprimer =
            id: 'parcheminsASupprimer',
            attributs: [['type', 'text'], ['size', '120'], ['placeholder', 'Introduire dans ce champ les numéros des parchemins à supprimer, séparés par des virgules']],
            parent: divParcheminsASupprimer });
    }

    _attacherInterfaceRecapituler() {
        const divBoutonRecapitulatif = Createur.elem('div', { parent: this.zone, style: "margin:1.5vmin; padding:1.5vmin; border:solid 1px black" });

        Createur.elem('button', {               // si besoin de nom : const boutonAfficherRecapitulatif =
            texte : 'Afficher Récapitulatif',
            style: "margin: 10px, width: " + window.getComputedStyle(this.boutonSupprimerParchemins).getPropertyValue("width"),
            parent: divBoutonRecapitulatif,
            events: [{nom: 'click', fonction: this.afficherRecapitulatif, bindElement: this}],
            classesHtml: ['mh_form_submit'] });

        this.texteRecapitulatif = Createur.elem('div', {                // si besoin de nom : const zoneRecapitulatif =
            id: 'recapitulatif',
            parent: divBoutonRecapitulatif });
    }

    viderTexteRecapitulatif() {
        this.texteRecapitulatif.innerHTML = "";
    }

    _attacherInterfaceFiltrer() {
        // idée au départ de pemettre de trier et filtrer sur chaque carac, avec min et max...
        // ... mais est-ce bine nécessaire ? (Aller jusqu'à deux ou 3 caracs en même temps ?)

        const divFiltrer = Createur.elem('div', { parent: this.zone, style: "margin:1vmin; padding:1vmin; border:solid 1px black" });

        let html =
            `<select style="margin:5px; padding:5px" id="typeRecherche" name="typeRecherche" title="la valeur indiquée sera comprise">
                <option value="${AU_MOINS}" selected>Plus grand que</option>
                <option value="${AU_PLUS}">Plus petit que</option>
            </select>`;

        html +=
            `<label style="margin:5px 0 5px 5px; padding:3px" for="puissanceRecherche">Puissance (-45 à 45) :</label>
            <input style="margin:5px 5px 5px 0; padding:3px" id="puissanceRecherche" name="puissanceRecherche" type="number" 
            min="-50" max="50" step="1" value="0" 
            title="Chaque points puissance a un impact sur l'effet. ATT, ESQ, PV => 1D3 / DEG, REG, PV, Vue, Duree, Zone => 1 / Tour => 15 min">`;

        html += `<select style="margin:5px; padding:3px" id="caracRecherche" name="caracRecherche" >`;
        html += `<option value="${TOUTES}">Toutes caracs</option>`;
        let copie = [...CARAC];
        copie.splice(8,1);                          // sans efet de zone
        for (const c of copie) {
            html += `<option value="${c.id}">${c.presentation}</option>`;
        }
        html += "</select>";

        html +=
            `<input style="margin:5px 0 5px 5px; padding:3px" id="effetZoneObligatoire" name="effetZoneObligatoire" type="checkbox">
              <label style="margin:5px 5px 5px 0; padding:3px" for="effetZoneObligatoire">Effet de zone possible</label>`

        html +=
            `<button style="margin:5px; padding:3px" class="mh_form_submit" id="boutonRecherche">Filtrer et Trier</button>`;

        divFiltrer.innerHTML = html;

        this.filtre.type = document.getElementById('typeRecherche');
        this.filtre.puissance = document.getElementById('puissanceRecherche');
        this.filtre.carac = document.getElementById('caracRecherche');
        this.filtre.zone = document.getElementById('effetZoneObligatoire');
        this.filtre.bouton = document.getElementById('boutonRecherche');
        this.filtre.bouton.addEventListener('click', this.afficherParcheminsFiltres.bind(this));

        // reste événements à gérer
    }

    _attacherTableParchemins() {
        this.table = Createur.elem('table', { id: "DragttageTable", parent: this.zone,
            style: "margin:1vmin; padding:1vmin; border:solid 1px black"});
    }

    viderTableParchemins() {
        this.table.innerHTML = "";
    }

    // renvoie un objet sauvegarde
    exporterParchemins() {
        const sauvegarde = {     // Sauvegarde pourrait avoir sa classe
            parchemins: [],
            index: this.index,
            dateEnregistrement: new Date().toLocaleString()
        };
        for (const p of this.parchemins) {
            let enregistrement = {
                id: p.id,
                nom: p.nom,
                effetDeBaseTexte: p.effetDeBaseTexte,
                glyphesNumeros: [],
                glyphesCoches: [],
                garde: p.potentiellementInteressant
            };
            for(const g of p.glyphes) {
                enregistrement.glyphesNumeros.push(g.numero);
                enregistrement.glyphesCoches.push(Number(g.coche));
            }
            sauvegarde.parchemins.push(enregistrement);
        }
        return sauvegarde;
    }

    // reçoit un objet sauvergarde
    importerParchemins(sauvegarde) {
        this.parchemins = [];

        if (sauvegarde.dateEnregistrement) this.zoneDateEnregistrement.innerText = "Date de la sauvegarde : " + sauvegarde.dateEnregistrement;
        for (const enregistrement of sauvegarde.parchemins) {
            this.parchemins.push(ParcheminEnPage.creerParchemin(enregistrement));
        }
        this.index = sauvegarde.index;
    }

    importerParcheminsEtAfficher(sauvegarde) {
        this.importerParchemins(sauvegarde)
        this.afficherParcheminsGardes();
        this.viderTexteRecapitulatif();
    }

    chargerLocalement() {
        if (window.localStorage.getItem('sauvegardeListerGrattages')) {
            const sauvegarde = JSON.parse(window.localStorage.getItem('sauvegardeListerGrattages'));
            this.importerParcheminsEtAfficher(sauvegarde);
        }
        else {
            alert('Aucune donnée trouvée localement.');
        }
    }

    sauvegarderLocalement() {
        const sauvegardeTexte = JSON.stringify(this.exporterParchemins());
        console.log(sauvegardeTexte); // normalement il y a l'export pour ça...
        window.localStorage.setItem('sauvegardeListerGrattages', sauvegardeTexte);
        alert("Etat sauvegardé.");
    }

    validerImport() {
        const introduit = prompt ("Collez l'enregistrement (Ctrl+V) à importer :", "");
        let sauvegarde;
        if (introduit) {
            try {
                sauvegarde = JSON.parse(introduit);
                this.importerParcheminsEtAfficher(sauvegarde);
                alert("Enregistrement importé.");
            }
            catch (e) {
                alert("Problème rencontré lors de l'import");
                console.log(e);
            }
        }
    }

    afficherExport() {
        // Ouch, le default value de chrome c'est maximum 2000 carac. Infini pour les autres... infini à l'insertion
        //prompt(" Voici l'enregistrement à copier (Ctrl+C) pour ensuite l'importer manuellement :",
        //JSON.stringify(this.exporterParchemins()));

        // Et pas possible de copier directement dans clipboard?... donc passer par un élément...
        copierDansPressePapier(this.exporterParchemins());
        alert("L'enregistrement est copié dans le presse-papier.\n" +
            "Vous pouvez maintenant le copier (Ctrl+v).");

        function copierDansPressePapier(texte) {
            // Create new element
            const textarea = document.createElement('textarea');
            textarea.value = JSON.stringify(texte);
            textarea.setAttribute('readonly', '');
            // ta.style.display = 'none'; // doit être visible pour être sélectionné? ...
            textarea.style = {position: 'absolute', left: '-9999px'}; // donc on le fout n'importe où
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

}

//************************* fin classes *************************


//-------------------- Traitement de la page d'équipement --------------------//

function getNumTroll() {
// Récupère le num de trõll dans la frame Menu
// Menu = top.frames["Sommaire"].document
// onclick du nom du trõll: "EnterPJView(numTroll,750,550)"
// Faudrait vraiment coller des id dans l'équipement...
    let
        liens,
        str,
        numTroll = false;
    try {
        liens = top.frames["Sommaire"].document.getElementsByTagName("a");
    } catch(e) {
        displayDebug(e);
        return false;
    }

    if(liens.length>0 && liens[0].onclick!==void(0)) {
        str = liens[0].onclick.toString();
        numTroll = parseInt(/\d+/.exec(str)[0]);
        displayDebug("numTroll = "+numTroll);
    }
    return numTroll;
}

function ouvrirListe() {
// Ouvre la page de listing
    // Ouvrir dans un nouvel onglet:
    //window.open("/mountyhall/Dragttage");
    // Ouvrir dans la frame de contenu:
    window.location.assign(urlOutilListerGrattage);
}

function traitementEquipement() {
// Ajout du lien dans l'équipement
    displayDebug("traitementEquipement");
    let
        numTroll = getNumTroll(),
        tr, td, btn,
        titreParchos;

    if (!numTroll) {
        displayDebug("Numéro de Trõll non trouvé : abandon");
        return;
    }
    tr = document.getElementById("mh_objet_hidden_"+numTroll+"Parchemin");
    if(!tr) {
        displayDebug("Table des parchos non trouvée : abandon");
        return;
    }

    // Récupération de la ligne de titre des parchos
    // titreParchos.cells:
    // 0: [+] / [-]
    // 1: "Parchemin"
    // 2: nb parchos
    // 3: poids total
    titreParchos = document.evaluate(
        "./preceding-sibling::tr[1]//table//tr[1]",
        tr, null, 9, null
    ).singleNodeValue;
    titreParchos.cells[1].style.width = "100px";
    td = titreParchos.insertCell(2);
    btn = document.createElement("input");
    btn.type = "button";
    btn.className = "mh_form_submit";
    btn.value = "Lister les grattages";
    btn.onclick = ouvrirListe;
    td.appendChild(btn);
}

//---------------------- MAIN -----------------------//

if (STATIQUE) {
    document.addEventListener('DOMContentLoaded', () => {new OutilListerGrattage()});
}

if (window.location.pathname == urlOutilListerGrattage) {
    displayDebug("C'est parti !");
    new OutilListerGrattage();
}

if (window.location.pathname == "/mountyhall/MH_Play/Play_equipement.php") {
    traitementEquipement();
}

//--------------------- parchemins hardcodes --------------//

const SAUVEGARDE_0 =
    `{"parchemins":[{"id":"4986515","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +4 | TOUR : -120 min","glyphesNumeros":["94488","87335","38177","16672","29969","57632","56613","16672","72997","72999"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true},` +
    `{"id":"8505213","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +4 D3 | DEG : +4 | Vue : -4","glyphesNumeros":["95521","75049","90396","26924","26902","97553","46369","85285","9509","78100"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true},` +
    `{"id":"10769725","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -9 | Effet de Zone","glyphesNumeros":["61722","45336","61720","95501","85269","11529","26892","61720","88344","23833"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true},` +
    `{"id":"10789472","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -9 | Effet de Zone","glyphesNumeros":["58649","99613","91417","62737","49416","71944","58649","3337","32033","60697"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true}],` +
    `"index":[0,1,2,3],` +
    `"dateEnregistrement":"11/06/2019 à 11:20:42"}`;

const SAUVEGARDE =
    `{"parchemins":[{"id":"985004","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["85261","75033","30984","102664","88332","65800","67848","53512","83213","11537"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1066280","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["87309","79137","10508","23817","15633","83213","58633","92428","26892","92428"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1157110","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["12552","37152","18704","79117","79117","88332","52493","90380","89357","90380"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1207438","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -1 D3 | TOUR : +30 min","glyphesNumeros":["83213","88332","76040","78104","64801","73992","12552","32041","89357","7433"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1252192","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["42249","9489","23825","88332","77073","10504","67856","72977","87309","92456"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1499639","nom":"Rune Explosive","effetDeBaseTexte":"PV : -8 D3 | Effet de Zone","glyphesNumeros":["66839","96532","62753","63776","10520","33036","17691","50443","68897","34081"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1537124","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["85265","84236","78092","68873","88332","75021","88332","74016","55564","83213"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1650257","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["21773","85261","72973","44297","46345","86284","48417","84236","9485","47384"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1665216","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -2 | Vue : -1 | PV : -2 D3","glyphesNumeros":["65808","40233","90380","57616","30992","61704","40201","92436","79145","88328"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1696600","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["58637","89357","86284","36121","92428","81165","72973","16656","86284","1289"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1751631","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["29969","4368","5393","80136","83213","84236","73996","90380","3341","24844"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1762370","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["12552","85261","84236","26888","70921","62729","58641","55560","90380","65816"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1802429","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["8460","21773","55584","9489","57608","87309","85261","92428","61704","83213"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1811720","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["102664","11561","86284","88332","15625","77069","86284","24844","7437","44297"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1971170","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["64785","82200","87309","28940","46345","90380","88332","54537","88332","4364"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"1976190","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["30984","35080","78088","87309","37136","53512","64777","84236","87309","62729"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2036628","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -4 | Vue : -1 | PV : -4 D3","glyphesNumeros":["71968","100632","79121","70921","61704","96520","46369","29985","43304","78096"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2101336","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -2 | Vue : -1 | PV : -2 D3","glyphesNumeros":["92436","29961","83213","35088","96544","64785","30992","53512","52521","15657"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2204391","nom":"Rune Explosive","effetDeBaseTexte":"PV : -2 D3 | Effet de Zone","glyphesNumeros":["34081","13577","99597","64777","38161","56617","52489","69896","35080","43272"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2234171","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["91401","61704","90380","89357","62753","9485","26892","89357","89357","10512"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2318670","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["90376","73996","79117","90380","42273","83213","90380","12552","59660","90380"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2444706","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -1 D3 | TOUR : +30 min","glyphesNumeros":["18696","89357","72969","68873","85261","85261","8456","47392","86288","77065"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2628359","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["57608","9485","29965","90380","36105","86284","58633","86284","86284","9481"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2703518","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["4368","77073","81177","39176","51464","19737","90380","91409","87309","81169"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2812407","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["52493","46345","78092","89357","82188","88332","83213","45344","93481","87309"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2855106","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["10516","88340","15629","84244","100620","12560","53528","26900","36113","15641"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2894767","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -1 D3 | TOUR : +30 min","glyphesNumeros":["72977","32033","90380","88332","4360","78088","88332","35080","47400","82184"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2948855","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +4 | TOUR : -120 min","glyphesNumeros":["52513","19729","74020","53542","53544","21769","102688","87335","77093","87313"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2969093","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +2 | TOUR : -60 min","glyphesNumeros":["18700","46353","83223","86294","11561","76052","74004","98568","52501","67880"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2976946","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["89357","87309","55560","5389","65816","87309","32009","12552","28940","86284"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2994249","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["12552","19753","83213","83213","87309","24844","89357","5389","54537"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"2997855","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -3 | Effet de Zone","glyphesNumeros":["99597","46345","44313","61704","85261","88332","56585","55560","97561","79121"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"3051605","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -2 | Vue : -1 | PV : -2 D3","glyphesNumeros":["80144","90380","38169","28944","71952","54537","92436","81161","32009","39208"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"3065537","nom":"Plan Génial","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | TOUR : -30 min","glyphesNumeros":["57616","83221","81173","4380","25879","99593","8460","16656","83221","36117"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"3069048","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["88332","95497","19745","56585","16656","46353","74000","85261","81169"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"3117592","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +2 | TOUR : -60 min","glyphesNumeros":["78100","88342","55572","1297","74006","41228","96520","73992","84244","76040"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"3214279","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -2 | Vue : -1 | PV : -2 D3","glyphesNumeros":["25873","45320","56585","7457","70929","1297","83213","34065","49440","90380"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"3232083","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["54537","86284","90380","30984","57608","65800","90380","62729","36121","86280"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"3661255","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["21769","87309","24844","88332","99625","8460","80136","85261","59656","90380"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"3734306","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["59660","83213","83217","43288","84236","86284","76044","82188","84236","91401"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"3971383","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["65800","86284","29961","87313","92428","88332","80136","66825","52489","61720"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4139593","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["94472","27917","7437","76044","50457","85261","86312","83213","92428","57608"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4156354","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["56601","83241","22796","3341","76044","85261","68873","25889","92428","89357"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4197051","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["98584","88340","75021","26900","6440","87317","18728","8468","12560","48397"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4282857","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["87317","69912","26908","44309","57616","94480","55584","5397","97549","92436"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4296956","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["79121","99625","5409","74000","22796","19729","85269","23825","64777"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4374936","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["89377","85261","22792","85261","86284","35080","13609","66825","59656","64777"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4425946","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["71948","69920","83221","42253","68881","6428","81161","89365","25877","98600"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4437232","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["84236","21773","75021","28952","43304","90380","57608","4364","59680","87309"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4486972","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["88340","84244","82188","14624","80144","18700","18720","8468","58649","26900"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4527905","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -1 D3 | TOUR : +30 min","glyphesNumeros":["89357","3337","76040","46345","75017","33032","87309","81193","92428","83225"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4534394","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -4 D3 | TOUR : +120 min","glyphesNumeros":["85257","45336","77089","12576","14618","81185","58633","50449","97553"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4640911","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["92428","85261","89357","37144","88352","59656","46345","88332","26892"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4867398","nom":"Plan Génial","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | TOUR : -30 min","glyphesNumeros":["77077","24852","86296","23825","47372","27917","85269","92456","89357","4374"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4897292","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["51464","86292","12560","77073","5393","7465","36109","77073","7457","50449"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4951251","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["86284","89357","73996","84236","90380","81165","90400","56589","68873","90376"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"4986515","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +4 | TOUR : -120 min","glyphesNumeros":["94488","87335","38177","16672","29969","57632","56613","16672","72997","72999"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5081716","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -12 | Effet de Zone","glyphesNumeros":["53528","88340","46369","36137","15633","61728","11561","97555","71952","61728"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5183258","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["90388","20744","84248","56585","74000","87321","78096","88332","46353","8464"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5183266","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["87309","90380","86284","25869","91401","53512","63768","8460","8456","89357"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5185325","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["4372","92456","74008","26900","79117","102672","55592","33036","90388","88340"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5234962","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["59656","88332","98576","89357","7437","92428","90380","24844","12552","61712"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5258132","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["67848","78092","87309","92428","42249","55564","57608","72973","85261","85261"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5302921","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["64777","12552","65800","87321","30984","93481","55560","85261","89357","89357"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5324554","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["25869","12560","85269","60685","8488","26916","3357","83221"],"glyphesCoches":[0,0,0,0,0,0,0,0],"garde":true },{"id":"5345706","nom":"Rune Explosive","effetDeBaseTexte":"PV : -2 D3 | Effet de Zone","glyphesNumeros":["71944","86304","37144","9513","38169","86288","23817","95497","99597","67848"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5581987","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -3 D3 | TOUR : +90 min","glyphesNumeros":["21801","85257","76056","7449","93473","36113","79129","80152","42249","70945"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5611560","nom":"Rune Explosive","effetDeBaseTexte":"PV : -2 D3 | Effet de Zone","glyphesNumeros":["65800","68873","84240","74016","98572","9481","29961","45352","64777","49424"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5642897","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -3 | Effet de Zone","glyphesNumeros":["83213","14624","60681","60681","100640","86284","61704","91401","26920","101645"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5648709","nom":"Rune Explosive","effetDeBaseTexte":"PV : -4 D3 | Effet de Zone","glyphesNumeros":["71952","47368","24864","97549","23825","3353","82216","66833","90384"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5837689","nom":"Rune Explosive","effetDeBaseTexte":"PV : -2 D3 | Effet de Zone","glyphesNumeros":["83225","66825","75041","91401","100620","44305","14624","90384","67848","42281"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5849294","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -1 D3 | TOUR : +30 min","glyphesNumeros":["91401","48401","78088","83241","84236","87309","10504","90380","74008","73992"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5879313","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -3 | Vue : -1 | PV : -4 D3","glyphesNumeros":["24856","70937","15641","71944","10528","84236","20744","37136","53520","102680"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5904897","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -1 D3 | TOUR : +30 min","glyphesNumeros":["81161","72969","7433","88332","47368","73992","85261","68873","14608","90380"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"5999154","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -4 D3 | TOUR : +120 min","glyphesNumeros":["72995","6412","85257","33032","9513","54569","13577","72993","68897","13609"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6106904","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["90380","92428","79121","22824","9489","67848","45320","77073","46353"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6118189","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +3 D3 | DEG : +3 | Vue : -3","glyphesNumeros":["92428","23833","82188","39188","96536","6428","60685","86300","85273","26908"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6147287","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -3 | Vue : -1 | PV : -4 D3","glyphesNumeros":["62737","5385","55560","22824","70937","90380","42257","1305","28952","79121"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6163594","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["63756","33064","26900","46353","47376","88340","9493","79125","64793","90396"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6167514","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["88340","100632","70945","91409","8480","73996","5397","90388","44301","26900"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6167879","nom":"Rune Explosive","effetDeBaseTexte":"PV : -2 D3 | Effet de Zone","glyphesNumeros":["37152","65800","77097","8488","97549","67848","46345","85257","63752","56609"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6215696","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["90376","88340","91409","84244","6420","38157","18700","89353","24852","38169"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6241166","nom":"Rune Explosive","effetDeBaseTexte":"PV : -4 D3 | Effet de Zone","glyphesNumeros":["70929","71952","98572","6440","88328","80144","86280","20744","49416","37160"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6325216","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["27917","77069","72969","84236","15633","4364","5409","57608","84236","89357"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6351525","nom":"Rune Explosive","effetDeBaseTexte":"PV : -4 D3 | Effet de Zone","glyphesNumeros":["56601","69904","45352","63760","84240","101653","72969","14600","68881","83213"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6377165","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["52489","90380","86284","66825","57608","66825","83213","25873","31016","29961"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6405324","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -1 D3 | TOUR : +30 min","glyphesNumeros":["78088","88332","85261","1289","40201","90380","29969","9481","84264","76040"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6511733","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -6 | Effet de Zone","glyphesNumeros":["39176","85269","55568","12560","88336","54545","61712","75017","43304","96524"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6574826","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -4 | Vue : -1 | PV : -4 D3","glyphesNumeros":["73001","91425","51480","29985","97553","86304","51464","78120","59656","66849"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6591288","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +2 | TOUR : -60 min","glyphesNumeros":["12560","21781","77079","52503","88352","75037","90388","22808","87317","5393"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6616005","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["83221","29973","6428","17677","83213","69896","84244","89369","46353","87337"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6649524","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +2 | TOUR : -60 min","glyphesNumeros":["1297","42253","67880","53520","72977","75031","86292","76054","56597","85269"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6719427","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | Vue : -1","glyphesNumeros":["84236","22792","84236","83213","29965","5389","91401","53536","54537","86284"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6742320","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["24872","90380","21773","22816","91401","82188","90380","6412","92428","78088"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6816337","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["85261","85261","86312","76072","80144","77073","30984","3345","50441","81169"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6852969","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["31000","86292","56589","40213","26900","47400","64793","4372","12560","88348"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6864349","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -4 | Vue : -1 | PV : -4 D3","glyphesNumeros":["70945","55584","78112","65816","1313","61736","78096","39192","26912","60681"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6929109","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["68873","85261","75021","89357","88332","86280","77073","88332","81165","54541"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6933746","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +4 D3 | DEG : +4 | Vue : -4","glyphesNumeros":["22820","98584","88356","13597","60695","80160","6436","37144","29973","98568"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6946179","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["90408","67848","59656","66825","90380","89357","30984","83213","1289","42249"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"6963736","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -3 D3 | TOUR : +90 min","glyphesNumeros":["16648","96528","78104","12568","18704","79113","9497","74008","60689","5385"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7026114","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["26892","73996","7437","12552","96544","33048","24848","92428","85261","92428"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7083001","nom":"Rune Explosive Gribouillé","effetDeBaseTexte":"DEG : +4 | REG : -4 | Vue : -5 | PV : -2 D3 | TOUR : -15 min | Effet de Zone","glyphesNumeros":["102664","101645","50449","49424","54569","71944","70921"],"glyphesCoches":[0,0,0,0,0,0,0],"garde":true },{"id":"7091909","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["81169","42249","5393","75025","88332","54561","50441","35088","26888","87309"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7098148","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["92428","62753","57608","76044","52493","11529","84236","88332","88332","73996"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7144573","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["26888","86284","81169","77073","23825","44297","86284","3345","85273","54545"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7169823","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -1 D3 | TOUR : +30 min","glyphesNumeros":["6408","88332","48417","56601","92428","9481","57608","85261","75017","78088"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7190229","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +5 | TOUR : -150 min","glyphesNumeros":["48393","99601","35112","45328","11529","76078","47384","55596","81199","24864"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7190333","nom":"Rune Explosive qui fait mal","effetDeBaseTexte":"PV : -6 D3 | Effet de Zone","glyphesNumeros":["96532","61712","36109","49416","95513","67864","69912","77073","46361","72985"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7202670","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["98600","85261","26892","90380","79117","90380","65816","35080","51472"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7223318","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -3 D3 | TOUR : +90 min","glyphesNumeros":["74008","11537","53520","92424","12568","78104","60689","52505","9481","9497"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7255967","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["58633","92428","102672","78096","50441","81169","65832","53528","5393","90380"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7394874","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -2 | Vue : -1 | PV : -2 D3","glyphesNumeros":["63768","88340","93473","15633","6424","48393","100632","92428","23825","27921"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7396379","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["84236","89357","16680","81169","74000","18696","29977","10512","68881","97545"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7416556","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -4 | Vue : -1 | PV : -4 D3","glyphesNumeros":["70945","91425","76048","25865","49432","5409","62753","38153","61704","25889"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7464974","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["96552","55560","63752","22792","85261","88332","70921","17689","1289","85261"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7521840","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -5 D3 | TOUR : +150 min","glyphesNumeros":["39184","79113","85257","91433","8490","16672","21785","59664","58649","81193"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7577744","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["85261","26888","87309","68873","62729","77089","65800","53512","7457","87309"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7800041","nom":"Rune Explosive","effetDeBaseTexte":"PV : -4 D3 | Effet de Zone","glyphesNumeros":["30984","54545","84236","101653","96552","23825","71960","10528","67856","67856"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"7851999","nom":"Rune Explosive","effetDeBaseTexte":"PV : -2 D3 | Effet de Zone","glyphesNumeros":["87337","62761","99601","101645","33032","91401","62729","25897","67848","4384"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8053508","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["4364","18704","78092","91401","90380","28968","85261","90380","24844","52513"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8069613","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["76044","30988","77097","85261","21785","102664","88332","89357","49424"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8299385","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -3 | Effet de Zone","glyphesNumeros":["88332","92432","61704","72993","56585","91401","52489","94476","88332","52489"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8330640","nom":"Rune Explosive","effetDeBaseTexte":"PV : -6 D3 | Effet de Zone","glyphesNumeros":["99593","92432","8488","98572","70937","80152","71960","75025","45336","20760"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8346496","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["83213","30984","9489","82192","21777","91409","75025","87309","99593","90392"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8355862","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["65824","83213","78092","73996","92428","85261","87309","60685","68873","38185"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8363549","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +3 | TOUR : -90 min","glyphesNumeros":["75039","86284","101665","49432","56605","75037","100632","33040","12568","87327"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8364791","nom":"Rune Explosive","effetDeBaseTexte":"PV : -10 D3 | Effet de Zone","glyphesNumeros":["5409","85273","57640","8464","96520","50465","30992","97549","66857","71976"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8366258","nom":"Plan Génial","effetDeBaseTexte":"ATT : +1 D3 | DEG : +1 | TOUR : -15 min","glyphesNumeros":["82188","70945","49432","89357","90380","26892","26920","84236","35080"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8368581","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -15 | Effet de Zone","glyphesNumeros":["61730","61704","43304","61736","7465","23849","61736","88340","89385"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8369959","nom":"Rune Explosive","effetDeBaseTexte":"PV : -4 D3 | Effet de Zone","glyphesNumeros":["85265","69904","46353","72993","64785","34061","29961","79113","29993","96532"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8436688","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +2 | TOUR : -60 min","glyphesNumeros":["84244","45336","78100","87317","13601","78102","91409","59672","53526","45324"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8457409","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +1 | TOUR : -30 min","glyphesNumeros":["84236","61708","92428","87309","81165","88332","35080","60697","82188"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8505213","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +4 D3 | DEG : +4 | Vue : -4","glyphesNumeros":["95521","75049","90396","26924","26902","97553","46369","85285","9509","78100"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8505214","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -6 | Effet de Zone","glyphesNumeros":["90388","97577","54545","101653","52499","46353","29969","54545","78092"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8508639","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["27921","25865","48393","83221","26900","51468","57616","5397","88340","4364"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8512743","nom":"Rune Explosive","effetDeBaseTexte":"PV : -4 D3 | Effet de Zone","glyphesNumeros":["71976","93449","32009","67856","55560","70929","37132","92424","102672","96532"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8539755","nom":"Rune Explosive","effetDeBaseTexte":"PV : -8 D3 | Effet de Zone","glyphesNumeros":["101653","8474","62753","59658","83213","39184","78102","51480","68897","66849"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8554783","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -3 | Vue : -1 | PV : -4 D3","glyphesNumeros":["70937","68889","95497","71976","55560","28952","81169","86280","70921","41224"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8588074","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +2 | TOUR : -60 min","glyphesNumeros":["94472","98572","54545","68881","54549","85271","82196","76054","90400","86292"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8621576","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["84244","72977","85257","32009","9497","49416","77073","45320","11533","46353"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8687025","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +2 | TOUR : -60 min","glyphesNumeros":["43288","74006","84246","83221","64777","102672","8460","53524","74004","84256"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8731834","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -6 | Effet de Zone","glyphesNumeros":["52497","87317","26896","101645","10504","102672","61712","56593","79137","65824"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8781310","nom":"Rune des Foins Gribouillé","effetDeBaseTexte":"DEG : +4 | Vue : -1 | PV : -12 D3 | Armure : +4","glyphesNumeros":["64809","62729","84236","86284","58633","62729","46345","65832","84236"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8786719","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -6 | Effet de Zone","glyphesNumeros":["80144","100620","85269","58641","29969","69896","61712","90384","101649","54545"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8788290","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["67848","83213","91401","52489","88332","51472","85261","98592","62729","29961"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8856313","nom":"Rune Explosive","effetDeBaseTexte":"PV : -2 D3 | Effet de Zone","glyphesNumeros":["18712","6432","58633","61704","52513","64777","12552","90400","67848","96524"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8858811","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["96536","84236","70921","69904","68873","30984","92428","92428","62729","61704"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"8980203","nom":"Idées Confuses Gribouillé","effetDeBaseTexte":"ATT : -5 D3 | REG : -5 | Vue : -3 | TOUR : +75 min | Effet de Zone","glyphesNumeros":["20752","101641","61720","74008","50473","9513","90396","57640"],"glyphesCoches":[0,0,0,0,0,0,0,0],"garde":true },{"id":"9033982","nom":"Traité de Clairvoyance Gribouillé","effetDeBaseTexte":"Vue : -6 | TOUR : -210 min","glyphesNumeros":["77101","91433","60697","59688","60719","77103","60697"],"glyphesCoches":[0,0,0,0,0,0,0],"garde":true },{"id":"9136783","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | Vue : -2","glyphesNumeros":["1297","18696","88340","71976","98592","66829","50445","27925","6420","87317"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9137351","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -4 | Vue : -1 | PV : -4 D3","glyphesNumeros":["63760","60681","24848","70929","29985","87305","23841","48409","20768","66849"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9175415","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -3 | Effet de Zone","glyphesNumeros":["67848","61704","80136","77081","100620","90380","52489","87309","61704","72985"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9216288","nom":"Rune Explosive","effetDeBaseTexte":"PV : -2 D3 | Effet de Zone","glyphesNumeros":["67848","27945","65824","93453","71944","88336","21793","1289","67880","100632"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9217677","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["88332","21769","102664","60681","67848","92428","87309","26920","41240","63752"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9223996","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["84236","1289","66857","86284","21769","55560","62729","62729","33032","87309"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9308040","nom":"Yeu'Ki'Pic Gribouillé","effetDeBaseTexte":"Vue : -6 | PV : +6 D3 | Effet de Zone","glyphesNumeros":["56593","54545","89377","51464","95509","89377","12560","54545","85269"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9358284","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -2 | Vue : -1 | PV : -2 D3","glyphesNumeros":["92428","8464","27921","75033","89353","61704","70921","71952","80144","92436"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9373620","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -1 | Vue : -1 | PV : -2 D3","glyphesNumeros":["18712","86284","54537","71944","70921","86284","81193","85261","30984","91401"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9508985","nom":"Rune Explosive","effetDeBaseTexte":"PV : -10 D3 | Effet de Zone","glyphesNumeros":["92448","97561","13593","53544","70953","71976","21769","100620","12584","44305"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9536162","nom":"Plan Génial","effetDeBaseTexte":"ATT : +5 D3 | DEG : +5 | TOUR : -75 min","glyphesNumeros":["7437","74000","79129","88328","45320","24848","91433","81199","21807","89361"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9548359","nom":"Traité de Clairvoyance","effetDeBaseTexte":"Vue : +3 | TOUR : -90 min","glyphesNumeros":["28968","81181","91417","58653","65812","83213","48409","33036","90414","78088"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9614231","nom":"Rune des Foins","effetDeBaseTexte":"DEG : -3 | Vue : -1 | PV : -4 D3","glyphesNumeros":["78104","55560","65800","98568","62745","15625","1305","29977","90380"],"glyphesCoches":[0,0,0,0,0,0,0,0,0],"garde":true },{"id":"9614246","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -3 | Effet de Zone","glyphesNumeros":["43288","60681","86312","87309","56585","56585","68873","61704","100620","83213"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"10406342","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -2 D3 | TOUR : +60 min","glyphesNumeros":["55576","66825","88332","20744","51464","5393","86284","74000","81169","68881"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"10406560","nom":"Rune des Cyclopes Gribouillé","effetDeBaseTexte":"ATT : +5 D3 | DEG : +6 | Vue : -1 | Armure : +3 | Effet de Zone","glyphesNumeros":["57640","26924","37150","61742","92452","30990","6444"],"glyphesCoches":[0,0,0,0,0,0,0],"garde":true },{"id":"10453894","nom":"Plan Génial","effetDeBaseTexte":"ATT : +2 D3 | DEG : +2 | TOUR : -30 min","glyphesNumeros":["27933","25873","12560","17681","98592","44329","90398","3349","83213","70933"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"10542064","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -9 | Effet de Zone","glyphesNumeros":["52497","88340","32017","30992","47368","100640","54553","61720","80152","10504"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"10667508","nom":"Rune des Cyclopes","effetDeBaseTexte":"ATT : +5 D3 | DEG : +5 | Vue : -5","glyphesNumeros":["66845","20760","100648","26924","6444","78088","80168","89381","86296","56607"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"10769725","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -9 | Effet de Zone","glyphesNumeros":["61722","45336","61720","95501","85269","11529","26892","61720","88344","23833"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"10789472","nom":"Yeu'Ki'Pic","effetDeBaseTexte":"Vue : -9 | Effet de Zone","glyphesNumeros":["58649","99613","91417","62737","49416","71944","58649","3337","32033","60697"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true },{"id":"11133231","nom":"Idées Confuses","effetDeBaseTexte":"ATT : -1 D3 | TOUR : +30 min","glyphesNumeros":["79113","73992","84236","5385","76040","70921","34057","83213","23817","84236"],"glyphesCoches":[0,0,0,0,0,0,0,0,0,0],"garde":true }],` +
    `"index":[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171],` +
    `"dateEnregistrement":"11/06/2019 à 11:20:42"}`;


