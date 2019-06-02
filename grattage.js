// ==UserScript==
// @name listeGrattages
// @namespace Violentmonkey Scripts
// @include */mountyhall/grattage*
// @grant none
// ==/UserScript==
//

let parchemins = [];
let glyphesCoches = {};
let parcheminsEffetFinal = {};
let parcheminsNoms = {};
let parcheminsSupprimes = {};
let parcheminsGlyphes = {};

document.addEventListener('DOMContentLoaded', rattraperLeCoup);



function rattraperLeCoup() {
    
    document.getElementsByTagName('body')[0].insertAdjacentHTML('afterbegin', '<p>Page fixe permettant de se faire une idée des fonctionnalités de la v1.0. Depuis lors l\'outil a évolué.</p>');
    
    document.querySelector('button').addEventListener('click', afficherRecapitulatif); // le premier...

    for (let e of document.querySelectorAll('button[id]')) {
        parchemins.push(e.id.split('-')[0]);
        e.addEventListener('click', supprimerParchemin);
    }

    for (let e of parchemins) {
        glyphesCoches[e] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    for (let e of document.querySelectorAll('td[id$=effet]')) {
        parcheminsEffetFinal[e.id.split('-')[0]] = e.innerHTML;
        parcheminsNoms[e.id.split('-')[0]] = e.previousElementSibling.innerHTML;
    }

    for (let e of document.querySelectorAll('td[id$="glyphe-0"]')) {
        let glyphes = [];
        glyphes.push(e.title.split(' ')[1].split('\n')[0]);
        glyphes.push(e.nextElementSibling.title.split(' ')[1].split('\n')[0]);
        glyphes.push(e.nextElementSibling.nextElementSibling.title.split(' ')[1].split('\n')[0]);
        glyphes.push(e.nextElementSibling.nextElementSibling.nextElementSibling.title.split(' ')[1].split('\n')[0]);
        glyphes.push(e.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.title.split(' ')[1].split('\n')[0]);
        glyphes.push(e.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.title.split(' ')[1].split('\n')[0]);
        glyphes.push(e.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.title.split(' ')[1].split('\n')[0]);
        glyphes.push(e.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.title.split(' ')[1].split('\n')[0]);
        glyphes.push(e.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.title.split(' ')[1].split('\n')[0]);
        glyphes.push(e.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.title.split(' ')[1].split('\n')[0]);
        parcheminsGlyphes[e.id.split('-')[0]] = glyphes;
    }

    for (let e of document.querySelectorAll('input[type=checkbox]')) {
        e.addEventListener('change', cliquerCheckboxGlyphe);
    }

}








function cliquerCheckboxGlyphe() {
    //console.log('clic');
    let infosGlyphes = this.id.split('-');
    let parchemin = infosGlyphes[0];
    let indiceGlyphe = infosGlyphes[2];
    let glyphe = document.getElementById(parchemin + '-glyphe-' + indiceGlyphe);

    if (this.checked) {
        glyphe.style.opacity = 0.25;
        glyphesCoches[parchemin][indiceGlyphe] = 1;
    }
    else {
        glyphe.style.opacity = 1;
        glyphesCoches[parchemin][indiceGlyphe] = 0;
    }
    rafraichirEffetTotal(parchemin);
}

const SANS_EFFET = 57632;
function rafraichirEffetTotal(parchemin) {
    let parcheminGratte = parcheminsGlyphes[parchemin].map((e, i) => glyphesCoches[parchemin][i] ? SANS_EFFET : e );
    let analyse = analyseGribouillages(parcheminGratte.join(' '));
    document.getElementById(parchemin + "-effet").innerHTML = analyse.effetParchemin;
    parcheminsEffetFinal[parchemin] = document.getElementById(parchemin + "-effet").innerHTML;
}

function supprimerParchemin() {
    let tr = this.parentNode.parentNode;
    tr.nextElementSibling.nextElementSibling.style.display = 'none';
    tr.nextElementSibling.style.display = 'none';
    tr.style.display = 'none';
    parcheminsSupprimes[this.id.split('-')[0]] = true;
}


function afficherRecapitulatif() {
    let reponse = '';
    let parcheminsFiltres = parchemins.filter(x => !(x in parcheminsSupprimes));
    for (let p of parcheminsFiltres) {
        reponse += `<p>${p} - ${parcheminsNoms[p]} : grattages `;
        let grattes = 0;
        for (let i = 0; i < glyphesCoches[p].length; i++) {
            if (glyphesCoches[p][i]) {
                reponse += (i + 1) + ' ';
                grattes++;
            }
        }
        if (grattes === 0) reponse += 'aucun ';
        reponse += "=> " + parcheminsEffetFinal[p] + '</p>';
    }
    document.getElementById('recapitulatif').innerHTML = reponse;
}




/* ******************* RECUPERE DE VAPU ET TARTAROT *********************  */

var couleurBonus = '336633'; // vert '336633'
var couleurMalus = '990000'; // rouge '990000'
var couleurAutre= '000000'; // noir '000000'
var couleurSansEffet = '707070'; // gris '707070'


// *** Analyse la suite de numéros de gribouillages reçue en paramètre et retourne le résultat sous forme d'un tableau de tableaux ***
function analyseGribouillages(parchemin) {
    try {
        var infoGribouillages = new Array();
        var effetGribouillages = new Array();
        var effetParchemin = '';
        var resultatAnalyse = new Array();

        // ****************************************************************************************************************************
        // *** algorithme de détermination des effets des Grattages des gribouillages par trollthar (85665) : version du 21/02/2013 ***
        // ****************************************************************************************************************************
        //  + traduction du python vers le javascript
        //  + tableau des caractéristiques
        //  + exclusion des gribouillages déjà grattés et totalement grattés
        //  + remplacement de la sortie console par des sauvegardes dans le tableau de résultat
        //  + remplacement de l'effet du Grattage du gribouillage par l'effet du gribouillage

        var numerosOriginaux = parchemin.split(' ');
        var numeros = parchemin.split(' ');

        // + tableau des caractéristiques, avec les noms/abréviations utilisés dans MountyHall et dans l'ordre des affichages dans MountyHall
        // ATT | ESQ | DEG | REG | Vue | PV | TOUR | Armure | Effet de Zone
        // plus Durée
        var caracteristiques = new Array();
        caracteristiques[0] = 'ATT : ';
        caracteristiques[1] = 'ESQ : ';
        caracteristiques[2] = 'DEG : ';
        caracteristiques[3] = 'REG : ';
        caracteristiques[4] = 'Vue : ';
        caracteristiques[5] = 'PV : ';
        caracteristiques[6] = 'TOUR : ';
        caracteristiques[7] = 'Armure : ';
        caracteristiques[8] = 'Effet de Zone : ';
        caracteristiques[9] = 'Durée : ';

        var effetDict = new Array();
        effetDict[1320] = [caracteristiques[0],caracteristiques[0]];
        effetDict[2344] = [caracteristiques[0],caracteristiques[1]];
        effetDict[3368] = [caracteristiques[0],caracteristiques[2]];
        effetDict[4392] = [caracteristiques[0],caracteristiques[7]];
        effetDict[5416] = [caracteristiques[0],caracteristiques[3]];
        effetDict[6440] = [caracteristiques[0],caracteristiques[4]];
        effetDict[7464] = [caracteristiques[0],caracteristiques[5]];
        effetDict[8488] = [caracteristiques[0],caracteristiques[6]];
        effetDict[9512] = [caracteristiques[0],caracteristiques[9]];
        effetDict[10536] = [caracteristiques[0],caracteristiques[8]];

        effetDict[11560] = [caracteristiques[1],caracteristiques[0]];
        effetDict[12584] = [caracteristiques[1],caracteristiques[1]];
        effetDict[13608] = [caracteristiques[1],caracteristiques[2]];
        effetDict[14632] = [caracteristiques[1],caracteristiques[7]];
        effetDict[15656] = [caracteristiques[1],caracteristiques[3]];
        effetDict[16680] = [caracteristiques[1],caracteristiques[4]];
        effetDict[17704] = [caracteristiques[1],caracteristiques[5]];
        effetDict[18728] = [caracteristiques[1],caracteristiques[6]];
        effetDict[19752] = [caracteristiques[1],caracteristiques[9]];
        effetDict[20776] = [caracteristiques[1],caracteristiques[8]];

        effetDict[21800] = [caracteristiques[2],caracteristiques[0]];
        effetDict[22824] = [caracteristiques[2],caracteristiques[1]];
        effetDict[23848] = [caracteristiques[2],caracteristiques[2]];
        effetDict[24872] = [caracteristiques[2],caracteristiques[7]];
        effetDict[25896] = [caracteristiques[2],caracteristiques[3]];
        effetDict[26920] = [caracteristiques[2],caracteristiques[4]];
        effetDict[27944] = [caracteristiques[2],caracteristiques[5]];
        effetDict[28968] = [caracteristiques[2],caracteristiques[6]];
        effetDict[29992] = [caracteristiques[2],caracteristiques[9]];
        effetDict[31016] = [caracteristiques[2],caracteristiques[8]];

        effetDict[32040] = [caracteristiques[7],caracteristiques[0]];
        effetDict[33064] = [caracteristiques[7],caracteristiques[1]];
        effetDict[34088] = [caracteristiques[7],caracteristiques[2]];
        effetDict[35112] = [caracteristiques[7],caracteristiques[7]];
        effetDict[36136] = [caracteristiques[7],caracteristiques[3]];
        effetDict[37160] = [caracteristiques[7],caracteristiques[4]];
        effetDict[38184] = [caracteristiques[7],caracteristiques[5]];
        effetDict[39208] = [caracteristiques[7],caracteristiques[6]];
        effetDict[40232] = [caracteristiques[7],caracteristiques[9]];
        effetDict[41256] = [caracteristiques[7],caracteristiques[8]];

        effetDict[42280] = [caracteristiques[3],caracteristiques[0]];
        effetDict[43304] = [caracteristiques[3],caracteristiques[1]];
        effetDict[44328] = [caracteristiques[3],caracteristiques[2]];
        effetDict[45352] = [caracteristiques[3],caracteristiques[7]];
        effetDict[46376] = [caracteristiques[3],caracteristiques[3]];
        effetDict[47400] = [caracteristiques[3],caracteristiques[4]];
        effetDict[48424] = [caracteristiques[3],caracteristiques[5]];
        effetDict[49448] = [caracteristiques[3],caracteristiques[6]];
        effetDict[50472] = [caracteristiques[3],caracteristiques[9]];
        effetDict[51496] = [caracteristiques[3],caracteristiques[8]];

        effetDict[52520] = [caracteristiques[4],caracteristiques[0]];
        effetDict[53544] = [caracteristiques[4],caracteristiques[1]];
        effetDict[54568] = [caracteristiques[4],caracteristiques[2]];
        effetDict[55592] = [caracteristiques[4],caracteristiques[7]];
        effetDict[56616] = [caracteristiques[4],caracteristiques[3]];
        effetDict[57640] = [caracteristiques[4],caracteristiques[4]];
        effetDict[58664] = [caracteristiques[4],caracteristiques[5]];
        effetDict[59688] = [caracteristiques[4],caracteristiques[6]];
        effetDict[60712] = [caracteristiques[4],caracteristiques[9]];
        effetDict[61736] = [caracteristiques[4],caracteristiques[8]];

        effetDict[62760] = [caracteristiques[5],caracteristiques[0]];
        effetDict[63784] = [caracteristiques[5],caracteristiques[1]];
        effetDict[64808] = [caracteristiques[5],caracteristiques[2]];
        effetDict[65832] = [caracteristiques[5],caracteristiques[7]];
        effetDict[66856] = [caracteristiques[5],caracteristiques[3]];
        effetDict[67880] = [caracteristiques[5],caracteristiques[4]];
        effetDict[68904] = [caracteristiques[5],caracteristiques[5]];
        effetDict[69928] = [caracteristiques[5],caracteristiques[6]];
        effetDict[70952] = [caracteristiques[5],caracteristiques[9]];
        effetDict[71976] = [caracteristiques[5],caracteristiques[8]];

        effetDict[73000] = [caracteristiques[6],caracteristiques[0]];
        effetDict[74024] = [caracteristiques[6],caracteristiques[1]];
        effetDict[75048] = [caracteristiques[6],caracteristiques[2]];
        effetDict[76072] = [caracteristiques[6],caracteristiques[7]];
        effetDict[77096] = [caracteristiques[6],caracteristiques[3]];
        effetDict[78120] = [caracteristiques[6],caracteristiques[4]];
        effetDict[79144] = [caracteristiques[6],caracteristiques[5]];
        effetDict[80168] = [caracteristiques[6],caracteristiques[6]];
        effetDict[81192] = [caracteristiques[6],caracteristiques[9]];
        effetDict[82216] = [caracteristiques[6],caracteristiques[8]];

        effetDict[83240] = [caracteristiques[9],caracteristiques[0]];
        effetDict[84264] = [caracteristiques[9],caracteristiques[1]];
        effetDict[85288] = [caracteristiques[9],caracteristiques[2]];
        effetDict[86312] = [caracteristiques[9],caracteristiques[7]];
        effetDict[87336] = [caracteristiques[9],caracteristiques[3]];
        effetDict[88360] = [caracteristiques[9],caracteristiques[4]];
        effetDict[89384] = [caracteristiques[9],caracteristiques[5]];
        effetDict[90408] = [caracteristiques[9],caracteristiques[6]];
        effetDict[91432] = [caracteristiques[9],caracteristiques[9]];
        effetDict[92456] = [caracteristiques[9],caracteristiques[8]];

        effetDict[93480] = [caracteristiques[8],caracteristiques[0]];
        effetDict[94504] = [caracteristiques[8],caracteristiques[1]];
        effetDict[95528] = [caracteristiques[8],caracteristiques[2]];
        effetDict[96552] = [caracteristiques[8],caracteristiques[7]];
        effetDict[97576] = [caracteristiques[8],caracteristiques[3]];
        effetDict[98600] = [caracteristiques[8],caracteristiques[4]];
        effetDict[99624] = [caracteristiques[8],caracteristiques[5]];
        effetDict[100648] = [caracteristiques[8],caracteristiques[6]];
        effetDict[101672] = [caracteristiques[8],caracteristiques[9]];
        effetDict[102696] = [caracteristiques[8],caracteristiques[8]];

        var uniteCarac = new Array();
        uniteCarac[caracteristiques[0]] = [1,' D3'];
        uniteCarac[caracteristiques[1]] = [1,' D3'];
        uniteCarac[caracteristiques[2]] = [1,''];
        uniteCarac[caracteristiques[7]] = [1,''];
        uniteCarac[caracteristiques[3]] = [1,''];
        uniteCarac[caracteristiques[4]] = [1,''];
        uniteCarac[caracteristiques[5]] = [1,' D3'];
        uniteCarac[caracteristiques[6]] = [-15,' min'];
        uniteCarac[caracteristiques[9]] = [1,' Tour'];
        uniteCarac[caracteristiques[8]] = [1,''];

        var effetTotal = new Array();
        effetTotal[caracteristiques[0]] = 0;
        effetTotal[caracteristiques[1]] = 0;
        effetTotal[caracteristiques[2]] = 0;
        effetTotal[caracteristiques[7]] = 0;
        effetTotal[caracteristiques[3]] = 0;
        effetTotal[caracteristiques[4]] = 0;
        effetTotal[caracteristiques[5]] = 0;
        effetTotal[caracteristiques[6]] = 0;
        effetTotal[caracteristiques[9]] = 0;
        effetTotal[caracteristiques[8]] = 0;

        var epaisseurDict = new Array();
        epaisseurDict[0] = 'Très gras';
        epaisseurDict[1] = 'Gras';
        epaisseurDict[2] = 'Moyen';
        epaisseurDict[3] = 'Fin';
        epaisseurDict[4] = 'Très fin (version 3)';
        epaisseurDict[5] = 'Très fin (version 2)';
        epaisseurDict[6] = 'Très fin (version 1)';

        var orientationDict = new Array();
        orientationDict[0] = 'Initiale';
        orientationDict[1] = 'Symétrie Horizontale';
        orientationDict[2] = 'Symétrie Verticale';
        orientationDict[3] = 'Symétrie Centrale';

        // Si le numéro est impair, on utilise le numéro pair le précédant
        for (var i=0;i<numeros.length;i++) {
            numeros[i] = parseInt(numeros[i]);
            if (numeros[i]%2==1){
                numeros[i] -=1;
            }
        }

        var numeroDeb = 1288
        var intervalle = 1024

        // boucle sur les numéros donnés en entrée
        for (var i=0;i<numeros.length;i++) {

            var debFamille = parseInt((numeros[i]-numeroDeb)/intervalle)*intervalle+numeroDeb;
            var repereTableau = debFamille+32;
            var epaisseur = parseInt((numeros[i]-debFamille)/8);
            var orientation = (numeros[i]-debFamille)/2%4;

            // + exclusion des gribouillages déjà Grattés ou totalement Grattés
            if (numeros[i] < numeroDeb || effetDict[repereTableau] == null || epaisseurDict[epaisseur] == null){
                infoGribouillages[i] = '<center><b>Gribouillage ' + numerosOriginaux[i] + '</b></center>';
                if (gribouillages[i].childNodes[0].value == 0) {
                    infoGribouillages[i] += '<hr/><i>Grattage impossible</i>';
                    effetGribouillages[i] = ajouteMiseEnForme('Vierge') + '<br/>&nbsp;';
                }
                else {
                    infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme('Aucun changement d\'effet');
                    effetGribouillages[i] = ajouteMiseEnForme('Sans effet') + '<br/>&nbsp;';
                }
            }
            else {

                var carac1 = effetDict[repereTableau][0];
                var carac2 = effetDict[repereTableau][1];

                // + remplacement de la sortie console par des sauvegardes dans infoGribouillages et effetGribouillages
                infoGribouillages[i] = '<center><b>Gribouillage ' + numerosOriginaux[i] + '</b></center>';
                infoGribouillages[i] += '<hr/>Epaisseur : ' + epaisseurDict[epaisseur];
                infoGribouillages[i] += '<br/>&nbsp;&nbsp;<b>&#8594;</b>&nbsp;Puissance : ' + Math.min(5, epaisseur+1);
                infoGribouillages[i] += '<br/>Orientation : ' + orientationDict[orientation];
                var bonusMalusDict = new Array();
                bonusMalusDict['Initiale'] = 'Malus | Bonus';
                bonusMalusDict['Symétrie Horizontale'] = 'Malus | Malus';
                bonusMalusDict['Symétrie Verticale'] = 'Bonus | Malus';
                bonusMalusDict['Symétrie Centrale'] = 'Bonus | Bonus';
                infoGribouillages[i] += '<br/>&nbsp;&nbsp;<b>&#8594;</b>&nbsp;' + bonusMalusDict[orientationDict[orientation]];

                //  + remplacement de l'effet du Grattage du gribouillage par l'effet du gribouillage et sauvegarde dans effetGribouillages
                effetGribouillages[i] = '';

                if (epaisseur == 0) {

                    if (orientation == 0 || orientation == 1) {
                        if (carac1 != carac2) {
                            infoGribouillages[i] += '<br/>Caractéristique 1 : ' + carac1.substring(0, carac1.length - 3);
                            infoGribouillages[i] += '<br/>Caractéristique 2 : Aucune';
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme(carac1 + (epaisseur+1)*uniteCarac[carac1][0] + uniteCarac[carac1][1]);
                            effetGribouillages[i] += ajouteMiseEnForme(carac1 + (-1*(epaisseur+1)*uniteCarac[carac1][0]) + uniteCarac[carac1][1]) + '<br/>&nbsp;';
                            effetTotal[carac1] += (epaisseur+1)*uniteCarac[carac1][0];
                        }
                        else {
                            infoGribouillages[i] += '<br/>Caractéristique 1 : ' + carac1.substring(0, carac1.length - 3);
                            infoGribouillages[i] += '<br/>Caractéristique 2 : ' + carac2.substring(0, carac2.length - 3);
                            infoGribouillages[i] += '<br/>&nbsp;&nbsp;(deux caractéristiques identiques s\'annulent)';
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme('Aucun changement');
                            effetGribouillages[i] += ajouteMiseEnForme('Sans effet') + '<br/>&nbsp;';
                        }
                    }
                    else {
                        if (carac1 != carac2) {
                            infoGribouillages[i] += '<br/>Caractéristique 1 : ' + carac1.substring(0, carac1.length - 3);
                            infoGribouillages[i] += '<br/>Caractéristique 2 : Aucune';
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme(carac1 + (-1*(epaisseur+1)*uniteCarac[carac1][0]) + uniteCarac[carac1][1]);
                            effetGribouillages[i] += ajouteMiseEnForme(carac1 + (epaisseur+1)*uniteCarac[carac1][0] + uniteCarac[carac1][1]) + '<br/>&nbsp;';
                            effetTotal[carac1] -= (epaisseur+1)*uniteCarac[carac1][0];
                        }
                        else {
                            infoGribouillages[i] += '<br/>Caractéristique 1 : ' + carac1.substring(0, carac1.length - 3);
                            infoGribouillages[i] += '<br/>Caractéristique 2 : ' + carac2.substring(0, carac2.length - 3);
                            infoGribouillages[i] += '<br/>&nbsp;&nbsp;(deux caractéristiques identiques s\'annulent)';
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme('Aucun changement');
                            effetGribouillages[i] += ajouteMiseEnForme('Sans effet') + '<br/>&nbsp;';
                        }
                    }

                }
                else {

                    infoGribouillages[i] += '<br/>Caractéristique 1 : ' + carac1.substring(0, carac1.length - 3);
                    infoGribouillages[i] += '<br/>Caractéristique 2 : ' + carac2.substring(0, carac2.length - 3);

                    if (orientation == 0) {
                        if (carac1 != carac2) {
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme(carac1 + (epaisseur+1)*uniteCarac[carac1][0] + uniteCarac[carac1][1]);
                            infoGribouillages[i] += ' | ' + ajouteMiseEnForme(carac2 + (-1*epaisseur*uniteCarac[carac2][0]) + uniteCarac[carac2][1]);
                            effetGribouillages[i] += ajouteMiseEnForme(carac1 + (-1*(epaisseur+1)*uniteCarac[carac1][0]) + uniteCarac[carac1][1]);
                            effetGribouillages[i] += '<br/>' + ajouteMiseEnForme(carac2 + epaisseur*uniteCarac[carac2][0] + uniteCarac[carac2][1]);
                            effetTotal[carac1] += (epaisseur+1)*uniteCarac[carac1][0];
                            effetTotal[carac2] -= epaisseur*uniteCarac[carac2][0];
                        }
                        else {
                            infoGribouillages[i] += '<br/>&nbsp;&nbsp;(deux caractéristiques identiques s\'annulent)';
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme('Aucun changement');
                            effetGribouillages[i] += ajouteMiseEnForme('Sans effet') + '<br/>&nbsp;';
                        }
                    }

                    if (orientation == 1) {
                        if (carac1 != carac2) {
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme(carac1 + (epaisseur+1)*uniteCarac[carac1][0] + uniteCarac[carac1][1]);
                            infoGribouillages[i] += ' | ' + ajouteMiseEnForme(carac2 + epaisseur*uniteCarac[carac2][0] + uniteCarac[carac2][1]);
                            effetGribouillages[i] += ajouteMiseEnForme(carac1 + (-1*(epaisseur+1)*uniteCarac[carac1][0]) + uniteCarac[carac1][1]);
                            effetGribouillages[i] += '<br/>' + ajouteMiseEnForme(carac2 + (-1*epaisseur*uniteCarac[carac2][0]) + uniteCarac[carac2][1]);
                            effetTotal[carac1] += (epaisseur+1)*uniteCarac[carac1][0];
                            effetTotal[carac2] += epaisseur*uniteCarac[carac2][0];
                        }
                        else {
                            infoGribouillages[i] += '<br/>&nbsp;&nbsp;(deux caractéristiques identiques s\'annulent)';
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme('Aucun changement');
                            effetGribouillages[i] += ajouteMiseEnForme('Sans effet') + '<br/>&nbsp;';
                        }
                    }

                    if (orientation == 2) {
                        if (carac1 != carac2) {
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>\t' + ajouteMiseEnForme(carac1 + (-1*(epaisseur+1)*uniteCarac[carac1][0]) + uniteCarac[carac1][1]);
                            infoGribouillages[i] += ' | ' + ajouteMiseEnForme(carac2 + epaisseur*uniteCarac[carac2][0] + uniteCarac[carac2][1]);
                            effetGribouillages[i] += ajouteMiseEnForme(carac1 + (epaisseur+1)*uniteCarac[carac1][0] + uniteCarac[carac1][1]);
                            effetGribouillages[i] += '<br/>' + ajouteMiseEnForme(carac2 + (-1*epaisseur*uniteCarac[carac2][0]) + uniteCarac[carac2][1]);
                            effetTotal[carac1] -= (epaisseur+1)*uniteCarac[carac1][0];
                            effetTotal[carac2] += epaisseur*uniteCarac[carac2][0];
                        }
                        else {
                            infoGribouillages[i] += '<br/>&nbsp;&nbsp;(deux caractéristiques identiques s\'annulent)';
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme('Aucun changement');
                            effetGribouillages[i] += ajouteMiseEnForme('Sans effet') + '<br/>&nbsp;';
                        }
                    }

                    if (orientation == 3) {
                        if (carac1 != carac2) {
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>\t' + ajouteMiseEnForme(carac1 + (-1*(epaisseur+1)*uniteCarac[carac1][0]) + uniteCarac[carac1][1]);
                            infoGribouillages[i] += ' | ' + ajouteMiseEnForme(carac2 + (-1*epaisseur*uniteCarac[carac2][0]) + uniteCarac[carac2][1]);
                            effetGribouillages[i] += ajouteMiseEnForme(carac1 + (epaisseur+1)*uniteCarac[carac1][0] + uniteCarac[carac1][1]);
                            effetGribouillages[i] += '<br/>' + ajouteMiseEnForme(carac2 + epaisseur*uniteCarac[carac2][0] + uniteCarac[carac2][1]);
                            effetTotal[carac1] -= (epaisseur+1)*uniteCarac[carac1][0];
                            effetTotal[carac2] -= epaisseur*uniteCarac[carac2][0];
                        }
                        else {
                            infoGribouillages[i] += '<br/>&nbsp;&nbsp;(deux caractéristiques identiques s\'annulent)';
                            infoGribouillages[i] += '<hr/><i>Résultat du Grattage</i> :<br/>&nbsp;&nbsp;' + ajouteMiseEnForme('Aucun changement');
                            effetGribouillages[i] += ajouteMiseEnForme('Sans effet') + '<br/>&nbsp;';
                        }
                    }

                }

            }

        }

        for (var i=0;i<caracteristiques.length;i++) {
            if (effetTotal[caracteristiques[i]] != 0 || caracteristiques[i] == caracteristiques[9]) {
                if (caracteristiques[i] == caracteristiques[8]) {
                    if (effetTotal[caracteristiques[i]] < 0) {
                        effetParchemin += ajouteMiseEnForme(caracteristiques[8]).replace(' : ','') + ' | ';
                    }
                }
                else {
                    effetParchemin += ajouteMiseEnForme(caracteristiques[i] + (-1*effetTotal[caracteristiques[i]]) + uniteCarac[caracteristiques[i]][1], 'effetTotal') + ' | ';
                }
            }
        }
        effetParchemin = effetParchemin.substring(0, effetParchemin.length - 3);

        resultatAnalyse['infoGribouillages'] = infoGribouillages;
        resultatAnalyse['effetGribouillages'] = effetGribouillages;
        resultatAnalyse['effetParchemin'] = effetParchemin;
        return resultatAnalyse;
    }
    catch (e) {
        alert('analyseGribouillages() : ' + e.message);
    }
}


// *** Met en forme la chaîne de caractères passée en paramètre, en fonction de son contenu et du type de mise en forme passé en deuxième paramètre ***
function ajouteMiseEnForme(chaineATraiter, typeMiseEnForme) {
    try {
        // traitement des chaînes de caractères de type caractéristique
        if (chaineATraiter.indexOf(' : ') != -1) {
            // récupération de la caractéristique, de sa valeur et de l'unité
            var caracteristique = chaineATraiter.substring(0, chaineATraiter.indexOf(' : ')+3);
            var autres = chaineATraiter.substring(chaineATraiter.indexOf(' : ')+3, chaineATraiter.length);
            var valeur = 0;
            var unite = '';
            if (autres.indexOf(' ') == -1) {
                valeur = autres.substring(0, autres.length);
            }
            else {
                valeur = autres.substring(0, autres.indexOf(' ')+1);
                unite = autres.substring(autres.indexOf(' ')+1, autres.length)
            }

            // traitements de la chaîne de caractères en fonction de la caractéristique
            var chaineTraitee = '';
            // cas spécifique de la caractéristique 'Durée : '
            if (caracteristique == 'Durée : ') {
                if (valeur > 0) {
                    chaineTraitee = '<b><font color = "' + couleurAutre + '">' + caracteristique;
                    // pas de '+' devant le nombre de Tours dans l'effet total du parchemin
                    if(typeMiseEnForme != 'effetTotal') {
                        chaineTraitee += '+';
                    }
                    chaineTraitee += valeur + unite;
                }
                else {
                    // pas de nombre de Tours négatif dans l'effet total du parchemin
                    if(typeMiseEnForme == 'effetTotal') {
                        chaineTraitee = '<b><font color = "' + couleurAutre + '">' + 'Durée : 0 Tour';
                        valeur = 0;
                    }
                    else {
                        chaineTraitee = '<b><font color = "' + couleurAutre + '">' + chaineATraiter;
                    }
                }
                // gestion du singulier/pluriel
                if (valeur < -1 || valeur > 1) {
                    chaineTraitee += 's</font></b>';
                }
                else {
                    chaineTraitee += '</font></b>'
                }
            }
            // cas spécifique de la caractéristique 'Effet de Zone : '
            else if (caracteristique == 'Effet de Zone : ') {
                if (valeur > 0) {
                    chaineTraitee = '<font color = "' + couleurAutre + '">' + caracteristique + '+' + valeur + unite + '</font>';
                }
                else {
                    chaineTraitee = '<font color = "' + couleurAutre + '">' + chaineATraiter + '</font>';
                }
            }
            // cas spécifique de la caractéristique 'TOUR : '
            else if (caracteristique == 'TOUR : ') {
                if (valeur > 0) {
                    chaineTraitee = '<b><font color = "' + couleurMalus + '">' + caracteristique + '+' + valeur + unite + '</font></b>';
                }
                else {
                    chaineTraitee = '<b><font color = "' + couleurBonus + '">' + caracteristique + valeur + unite + '</font></b>';
                }
            }
            // cas des autres caractéristiques
            else {
                if (valeur > 0) {
                    chaineTraitee = '<b><font color = "' + couleurBonus + '">' + caracteristique + '+' + valeur + unite + '</font></b>';
                }
                else {
                    chaineTraitee = '<b><font color = "' + couleurMalus + '">' + caracteristique + valeur + unite + '</font></b>';
                }
            }
            return chaineTraitee;
        }
        // traitement des chaînes de caractères autres que de type caractéristique
        else {
            return '<font color = "' + couleurSansEffet + '">' +chaineATraiter + '</font>';
        }
    }
    catch (e) {
        alert('ajouteMiseEnForme() : ' + e.message);
    }
}
