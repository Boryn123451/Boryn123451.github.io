export interface FormulaEntry {
  id: string;
  category: string;
  title: string;
  latex: string;
  plain: string;
  keywords: string[];
}

export interface FormulaPage {
  page: number;
  heading: string;
  formulas: FormulaEntry[];
}

type Seed = [string, string, string, string, string[]];

function entry(category: string, title: string, latex: string, plain: string, keywords: string[]): FormulaEntry {
  return {
    id: `${category}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    category,
    title,
    latex,
    plain,
    keywords,
  };
}

function fromSeeds(seeds: Seed[]): FormulaEntry[] {
  return seeds.map(([category, title, latex, plain, keywords]) =>
    entry(category, title, latex, plain, keywords),
  );
}

const coreSeeds: Seed[] = [
  ["Algebra", "Kwadrat sumy", "(a+b)^2 = a^2 + 2ab + b^2", "(a+b)^2 = a^2 + 2ab + b^2", ["kwadrat", "suma"]],
  ["Algebra", "Kwadrat roznicy", "(a-b)^2 = a^2 - 2ab + b^2", "(a-b)^2 = a^2 - 2ab + b^2", ["kwadrat", "roznica"]],
  ["Algebra", "Roznica kwadratow", "a^2-b^2 = (a-b)(a+b)", "a^2-b^2 = (a-b)(a+b)", ["rozklad"]],
  ["Algebra", "Szescian sumy", "(a+b)^3 = a^3 + 3a^2b + 3ab^2 + b^3", "(a+b)^3 = a^3 + 3a^2b + 3ab^2 + b^3", ["szescian"]],
  ["Algebra", "Szescian roznicy", "(a-b)^3 = a^3 - 3a^2b + 3ab^2 - b^3", "(a-b)^3 = a^3 - 3a^2b + 3ab^2 - b^3", ["szescian"]],
  ["Algebra", "Suma szescianow", "a^3+b^3 = (a+b)(a^2-ab+b^2)", "a^3+b^3 = (a+b)(a^2-ab+b^2)", ["rozklad"]],
  ["Algebra", "Roznica szescianow", "a^3-b^3 = (a-b)(a^2+ab+b^2)", "a^3-b^3 = (a-b)(a^2+ab+b^2)", ["rozklad"]],
  ["Algebra", "Delta", "\\Delta = b^2-4ac", "Delta = b^2-4ac", ["kwadratowe"]],
  ["Algebra", "Pierwiastki kwadratowe", "x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}", "x = (-b +- sqrt(Delta))/(2a)", ["kwadratowe"]],
  ["Potegi i logarytmy", "Dodawanie wykladnikow", "a^m a^n = a^{m+n}", "a^m a^n = a^(m+n)", ["potegi"]],
  ["Potegi i logarytmy", "Potega potegi", "(a^m)^n = a^{mn}", "(a^m)^n = a^(mn)", ["potegi"]],
  ["Potegi i logarytmy", "Wykladnik ujemny", "a^{-n} = \\frac{1}{a^n}", "a^(-n) = 1/a^n", ["potegi"]],
  ["Potegi i logarytmy", "Pierwiastek jako potega", "\\sqrt[n]{a} = a^{1/n}", "root(n,a)=a^(1/n)", ["pierwiastek"]],
  ["Potegi i logarytmy", "Logarytm iloczynu", "\\log_a(xy)=\\log_a x + \\log_a y", "log_a(xy)=log_a x+log_a y", ["logarytm"]],
  ["Potegi i logarytmy", "Logarytm ilorazu", "\\log_a\\left(\\frac{x}{y}\\right)=\\log_a x - \\log_a y", "log_a(x/y)=log_a x-log_a y", ["logarytm"]],
  ["Potegi i logarytmy", "Logarytm potegi", "\\log_a(x^n)=n\\log_a x", "log_a(x^n)=n log_a x", ["logarytm"]],
  ["Trygonometria", "Jedynka trygonometryczna", "\\sin^2 x + \\cos^2 x = 1", "sin^2(x)+cos^2(x)=1", ["tozsamosc", "tryg"]],
  ["Trygonometria", "Jedynka tangensowa", "1+\\tan^2 x = \\sec^2 x", "1+tan^2(x)=sec^2(x)", ["tozsamosc"]],
  ["Trygonometria", "Jedynka cotangensowa", "1+\\cot^2 x = \\csc^2 x", "1+cot^2(x)=csc^2(x)", ["tozsamosc"]],
  ["Trygonometria", "Sinus sumy", "\\sin(a+b)=\\sin a\\cos b + \\cos a\\sin b", "sin(a+b)=sin a cos b + cos a sin b", ["suma"]],
  ["Trygonometria", "Cosinus sumy", "\\cos(a+b)=\\cos a\\cos b - \\sin a\\sin b", "cos(a+b)=cos a cos b - sin a sin b", ["suma"]],
  ["Trygonometria", "Sinus podwojnego kata", "\\sin 2x = 2\\sin x\\cos x", "sin(2x)=2sin(x)cos(x)", ["podwojny"]],
  ["Trygonometria", "Cosinus podwojnego kata", "\\cos 2x = 1-2\\sin^2 x", "cos(2x)=1-2sin^2(x)", ["podwojny"]],
  ["Trygonometria", "Tangens podwojnego kata", "\\tan 2x = \\frac{2\\tan x}{1-\\tan^2 x}", "tan(2x)=2tan(x)/(1-tan^2(x))", ["podwojny"]],
  ["Trygonometria", "Suma sinusow", "\\sin a + \\sin b = 2\\sin\\frac{a+b}{2}\\cos\\frac{a-b}{2}", "sin a+sin b = 2sin((a+b)/2)cos((a-b)/2)", ["suma", "iloczyn"]],
  ["Trygonometria", "Suma cosinusow", "\\cos a + \\cos b = 2\\cos\\frac{a+b}{2}\\cos\\frac{a-b}{2}", "cos a+cos b = 2cos((a+b)/2)cos((a-b)/2)", ["suma", "iloczyn"]],
  ["Trygonometria", "Iloczyn sinusow", "\\sin a\\sin b = \\frac{1}{2}[\\cos(a-b)-\\cos(a+b)]", "sin a sin b = (cos(a-b)-cos(a+b))/2", ["iloczyn"]],
  ["Trygonometria", "Iloczyn cosinusow", "\\cos a\\cos b = \\frac{1}{2}[\\cos(a-b)+\\cos(a+b)]", "cos a cos b = (cos(a-b)+cos(a+b))/2", ["iloczyn"]],
  ["Funkcje hiperboliczne", "Definicja sinh", "\\sinh x = \\frac{e^x-e^{-x}}{2}", "sinh x = (e^x-e^-x)/2", ["hiperboliczne"]],
  ["Funkcje hiperboliczne", "Definicja cosh", "\\cosh x = \\frac{e^x+e^{-x}}{2}", "cosh x = (e^x+e^-x)/2", ["hiperboliczne"]],
  ["Funkcje hiperboliczne", "Jedynka hiperboliczna", "\\cosh^2 x - \\sinh^2 x = 1", "cosh^2 x - sinh^2 x = 1", ["hiperboliczne"]],
  ["Macierze i zespolone", "Wyznacznik 2x2", "\\det\\begin{bmatrix}a & b\\\\ c & d\\end{bmatrix}=ad-bc", "det([[a,b],[c,d]])=ad-bc", ["macierz"]],
  ["Macierze i zespolone", "Macierz odwrotna 2x2", "\\begin{bmatrix}a & b\\\\ c & d\\end{bmatrix}^{-1}=\\frac{1}{ad-bc}\\begin{bmatrix}d & -b\\\\ -c & a\\end{bmatrix}", "A^-1 = 1/(ad-bc)[[d,-b],[-c,a]]", ["macierz"]],
  ["Macierze i zespolone", "Liczba zespolona", "z=a+bi", "z=a+bi", ["zespolone"]],
  ["Macierze i zespolone", "Modul liczby zespolonej", "|a+bi|=\\sqrt{a^2+b^2}", "|a+bi|=sqrt(a^2+b^2)", ["zespolone"]],
  ["Macierze i zespolone", "Wzor de Moivre'a", "(\\cos \\varphi + i\\sin \\varphi)^n = \\cos(n\\varphi)+i\\sin(n\\varphi)", "(cos phi + i sin phi)^n = cos(nphi)+i sin(nphi)", ["moivre"]],
  ["Geometria", "Pole kola", "P=\\pi r^2", "P = pi r^2", ["kolo"]],
  ["Geometria", "Obwod kola", "L=2\\pi r", "L = 2 pi r", ["kolo"]],
  ["Geometria", "Pole trojkata", "P=\\frac{ah}{2}", "P = ah/2", ["trojkat"]],
  ["Geometria", "Twierdzenie Pitagorasa", "a^2+b^2=c^2", "a^2+b^2=c^2", ["pitagoras"]],
  ["Geometria", "Prawo sinusow", "\\frac{a}{\\sin\\alpha}=\\frac{b}{\\sin\\beta}=\\frac{c}{\\sin\\gamma}", "a/sin alpha = b/sin beta = c/sin gamma", ["trojkat"]],
  ["Geometria", "Prawo cosinusow", "c^2=a^2+b^2-2ab\\cos\\gamma", "c^2=a^2+b^2-2ab cos gamma", ["trojkat"]],
];

const pdfSeeds: Seed[] = [
  ["Wartosc bezwzgledna", "Definicja wartosci bezwzglednej", "|x|=\\begin{cases}x,&x\\ge 0\\\\-x,&x<0\\end{cases}", "|x| = x for x>=0, -x for x<0", ["modul", "wartosc bezwzgledna"]],
  ["Wartosc bezwzgledna", "Nierownosc trojkata", "|x+y|\\le |x|+|y|", "|x+y| <= |x| + |y|", ["nierownosc"]],
  ["Wartosc bezwzgledna", "Iloczyn modulow", "|xy|=|x||y|", "|xy| = |x||y|", ["modul"]],
  ["Wartosc bezwzgledna", "Iloraz modulow", "\\left|\\frac{x}{y}\\right|=\\frac{|x|}{|y|}", "|x/y| = |x|/|y|", ["modul"]],
  ["Potegi i pierwiastki", "Pierwiastek kwadratowy", "\\sqrt{x^2}=|x|", "sqrt(x^2)=|x|", ["pierwiastek"]],
  ["Potegi i pierwiastki", "Potega ulamkowa", "x^{m/n}=\\sqrt[n]{x^m}", "x^(m/n)=root(n,x^m)", ["potega"]],
  ["Potegi i pierwiastki", "Potega ujemna", "x^{-m}=\\frac{1}{x^m}", "x^(-m)=1/x^m", ["potega"]],
  ["Logarytmy", "Zmiana podstawy", "\\log_b a = \\frac{\\log_c a}{\\log_c b}", "log_b(a)=log_c(a)/log_c(b)", ["logarytm"]],
  ["Logarytmy", "Logarytm odwrotnosci", "\\log_a\\left(\\frac{1}{x}\\right)=-\\log_a x", "log_a(1/x)=-log_a(x)", ["logarytm"]],
  ["Kombinatoryka", "Permutacje", "P_n=n!", "P_n=n!", ["permutacje"]],
  ["Kombinatoryka", "Kombinacje", "\\binom{n}{k}=\\frac{n!}{k!(n-k)!}", "C(n,k)=n!/(k!(n-k)!)", ["kombinacje"]],
  ["Kombinatoryka", "Wariacje bez powtorzen", "V(n,k)=\\frac{n!}{(n-k)!}", "V(n,k)=n!/(n-k)!", ["wariacje"]],
  ["Kombinatoryka", "Wariacje z powtorzeniami", "V_p(n,k)=n^k", "V_p(n,k)=n^k", ["wariacje"]],
  ["Funkcja kwadratowa", "Wspolrzedne wierzcholka", "x_w=-\\frac{b}{2a},\\quad y_w=-\\frac{\\Delta}{4a}", "xw=-b/(2a), yw=-Delta/(4a)", ["kwadratowa"]],
  ["Funkcja kwadratowa", "Postac kanoniczna", "f(x)=a(x-p)^2+q", "f(x)=a(x-p)^2+q", ["kwadratowa"]],
  ["Funkcja kwadratowa", "Postac iloczynowa", "f(x)=a(x-x_1)(x-x_2)", "f(x)=a(x-x1)(x-x2)", ["kwadratowa"]],
  ["Funkcja kwadratowa", "Wzory Viete'a", "x_1+x_2=-\\frac{b}{a},\\quad x_1x_2=\\frac{c}{a}", "x1+x2=-b/a, x1x2=c/a", ["viete"]],
  ["Ciagi", "Wyraz ciagu arytmetycznego", "a_n=a_1+(n-1)r", "a_n=a_1+(n-1)r", ["ciag", "arytmetyczny"]],
  ["Ciagi", "Suma ciagu arytmetycznego", "S_n=\\frac{a_1+a_n}{2}n", "S_n=(a_1+a_n)n/2", ["ciag", "arytmetyczny"]],
  ["Ciagi", "Wyraz ciagu geometrycznego", "a_n=a_1q^{n-1}", "a_n=a_1 q^(n-1)", ["ciag", "geometryczny"]],
  ["Ciagi", "Suma ciagu geometrycznego", "S_n=a_1\\frac{1-q^n}{1-q}", "S_n=a_1(1-q^n)/(1-q)", ["ciag", "geometryczny"]],
  ["Ciagi", "Suma nieskonczonego geometrycznego", "S=\\frac{a_1}{1-q}", "S=a_1/(1-q)", ["ciag", "geometryczny"]],
  ["Procent skladany", "Kapital koncowy", "K_n=K_0\\left(1+\\frac{p}{100}\\right)^n", "K_n=K_0(1+p/100)^n", ["procent"]],
  ["Granice", "Granica liczby e", "\\lim_{n\\to\\infty}\\left(1+\\frac{1}{n}\\right)^n=e", "lim (1+1/n)^n = e", ["granica"]],
  ["Granice", "Granica pierwiastka n-tego", "\\lim_{n\\to\\infty}\\sqrt[n]{a}=1", "lim root(n,a)=1", ["granica"]],
  ["Planimetria", "Pole trojkata z wysokoscia", "P=\\frac{ah}{2}", "P=ah/2", ["trojkat"]],
  ["Planimetria", "Pole trojkata z sinusem", "P=\\frac{1}{2}ab\\sin\\gamma", "P=ab sin(gamma)/2", ["trojkat"]],
  ["Planimetria", "Wzor Herona", "P=\\sqrt{s(s-a)(s-b)(s-c)}", "P=sqrt(s(s-a)(s-b)(s-c))", ["trojkat"]],
  ["Planimetria", "Pole trojkata przez promien opisany", "P=\\frac{abc}{4R}", "P=abc/(4R)", ["trojkat"]],
  ["Planimetria", "Pole trojkata przez promien wpisany", "P=sr", "P=sr", ["trojkat"]],
  ["Planimetria", "Wysokosc w trojkacie rownobocznym", "h=\\frac{a\\sqrt{3}}{2}", "h=a sqrt(3)/2", ["rownooboczny"]],
  ["Planimetria", "Pole trojkata rownobocznego", "P=\\frac{a^2\\sqrt{3}}{4}", "P=a^2 sqrt(3)/4", ["rownooboczny"]],
  ["Planimetria", "Promien wpisanego w rownobocznym", "r=\\frac{h}{3}", "r=h/3", ["rownooboczny"]],
  ["Planimetria", "Promien opisanego w rownobocznym", "R=\\frac{2h}{3}", "R=2h/3", ["rownooboczny"]],
  ["Planimetria", "Twierdzenie Talesa", "\\frac{|AB|}{|PA|}=\\frac{|CD|}{|PC|}", "|AB|/|PA|=|CD|/|PC|", ["tales"]],
  ["Planimetria", "Pole wycinka kola", "P=\\frac{\\alpha}{360^\\circ}\\pi r^2", "P=(alpha/360)pi r^2", ["kolo"]],
  ["Planimetria", "Dlugosc luku", "l=\\frac{\\alpha}{360^\\circ}2\\pi r", "l=(alpha/360)2pi r", ["kolo"]],
  ["Czworokaty", "Pole trapezu", "P=\\frac{(a+b)h}{2}", "P=(a+b)h/2", ["trapez"]],
  ["Czworokaty", "Pole rownolegloboku", "P=ah", "P=ah", ["rownoleglobok"]],
  ["Czworokaty", "Pole rownolegloboku z sinusem", "P=ab\\sin\\alpha", "P=ab sin(alpha)", ["rownoleglobok"]],
  ["Czworokaty", "Pole rombu", "P=a^2\\sin\\alpha", "P=a^2 sin(alpha)", ["romb"]],
  ["Czworokaty", "Pole rombu przez przekatne", "P=\\frac{ef}{2}", "P=ef/2", ["romb"]],
  ["Czworokaty", "Pole deltoidu", "P=\\frac{ef}{2}", "P=ef/2", ["deltoid"]],
  ["Czworokaty", "Warunek okregu opisanego", "\\alpha+\\gamma=180^\\circ,\\quad \\beta+\\delta=180^\\circ", "alpha+gamma=180, beta+delta=180", ["okrag opisany"]],
  ["Czworokaty", "Warunek okregu wpisanego", "a+c=b+d", "a+c=b+d", ["okrag wpisany"]],
  ["Geometria analityczna", "Dlugosc odcinka", "|AB|=\\sqrt{(x_B-x_A)^2+(y_B-y_A)^2}", "|AB|=sqrt((xB-xA)^2+(yB-yA)^2)", ["odcinek"]],
  ["Geometria analityczna", "Srodek odcinka", "S=\\left(\\frac{x_A+x_B}{2},\\frac{y_A+y_B}{2}\\right)", "S=((xA+xB)/2,(yA+yB)/2)", ["odcinek"]],
  ["Geometria analityczna", "Rownanie kierunkowe prostej", "y=ax+b", "y=ax+b", ["prosta"]],
  ["Geometria analityczna", "Prosta przez punkt", "y-y_0=a(x-x_0)", "y-y0=a(x-x0)", ["prosta"]],
  ["Geometria analityczna", "Wspolczynnik kierunkowy", "a=\\frac{y_B-y_A}{x_B-x_A}", "a=(yB-yA)/(xB-xA)", ["prosta"]],
  ["Geometria analityczna", "Rownanie ogolne prostej", "Ax+By+C=0", "Ax+By+C=0", ["prosta"]],
  ["Geometria analityczna", "Proste rownolegle", "a_1=a_2", "a1=a2", ["prosta"]],
  ["Geometria analityczna", "Proste prostopadle", "a_1a_2=-1", "a1 a2 = -1", ["prosta"]],
  ["Geometria analityczna", "Odleglosc punktu od prostej", "d=\\frac{|Ax_0+By_0+C|}{\\sqrt{A^2+B^2}}", "d=|Ax0+By0+C|/sqrt(A^2+B^2)", ["prosta"]],
  ["Geometria analityczna", "Okrag w postaci kanonicznej", "(x-a)^2+(y-b)^2=r^2", "(x-a)^2+(y-b)^2=r^2", ["okrag"]],
  ["Geometria analityczna", "Pole trojkata ze wspolrzednych", "P=\\frac{1}{2}|(x_B-x_A)(y_C-y_A)-(y_B-y_A)(x_C-x_A)|", "P=|(xB-xA)(yC-yA)-(yB-yA)(xC-xA)|/2", ["trojkat"]],
  ["Geometria analityczna", "Srodek ciezkosci trojkata", "G=\\left(\\frac{x_A+x_B+x_C}{3},\\frac{y_A+y_B+y_C}{3}\\right)", "G=((xA+xB+xC)/3,(yA+yB+yC)/3)", ["trojkat"]],
  ["Stereometria", "Pole powierzchni kuli", "P_c=4\\pi r^2", "P_c=4pi r^2", ["kula"]],
  ["Stereometria", "Objetosc kuli", "V=\\frac{4}{3}\\pi r^3", "V=4pi r^3/3", ["kula"]],
  ["Stereometria", "Pole powierzchni prostopadloscianu", "P_c=2(ab+bc+ca)", "P_c=2(ab+bc+ca)", ["prostopadloscian"]],
  ["Stereometria", "Objetosc prostopadloscianu", "V=abc", "V=abc", ["prostopadloscian"]],
  ["Stereometria", "Pole boczne graniastoslupa prostego", "P_b=O_p h", "P_b=O_p h", ["graniastoslup"]],
  ["Stereometria", "Objetosc graniastoslupa", "V=P_p h", "V=P_p h", ["graniastoslup"]],
  ["Stereometria", "Objetosc ostroslupa", "V=\\frac{1}{3}P_p h", "V=P_p h/3", ["ostroslup"]],
  ["Stereometria", "Pole boczne walca", "P_b=2\\pi rh", "P_b=2pi rh", ["walec"]],
  ["Stereometria", "Pole calkowite walca", "P_c=2\\pi r(r+h)", "P_c=2pi r(r+h)", ["walec"]],
  ["Stereometria", "Objetosc walca", "V=\\pi r^2 h", "V=pi r^2 h", ["walec"]],
  ["Stereometria", "Pole boczne stozka", "P_b=\\pi rl", "P_b=pi rl", ["stozek"]],
  ["Stereometria", "Pole calkowite stozka", "P_c=\\pi r(r+l)", "P_c=pi r(r+l)", ["stozek"]],
  ["Stereometria", "Objetosc stozka", "V=\\frac{1}{3}\\pi r^2 h", "V=pi r^2 h/3", ["stozek"]],
  ["Prawdopodobienstwo", "Klasyczna definicja prawdopodobienstwa", "P(A)=\\frac{|A|}{|\\Omega|}", "P(A)=|A|/|Omega|", ["prawdopodobienstwo"]],
  ["Prawdopodobienstwo", "Prawdopodobienstwo przeciwne", "P(A')=1-P(A)", "P(A')=1-P(A)", ["prawdopodobienstwo"]],
  ["Prawdopodobienstwo", "Suma zdarzen", "P(A\\cup B)=P(A)+P(B)-P(A\\cap B)", "P(AuB)=P(A)+P(B)-P(AnB)", ["prawdopodobienstwo"]],
  ["Prawdopodobienstwo", "Schemat Bernoulliego", "P_n(k)=\\binom{n}{k}p^k q^{n-k}", "P_n(k)=C(n,k)p^k q^(n-k)", ["bernoulli"]],
  ["Prawdopodobienstwo", "Prawdopodobienstwo warunkowe", "P(A|B)=\\frac{P(A\\cap B)}{P(B)}", "P(A|B)=P(A n B)/P(B)", ["warunkowe"]],
  ["Prawdopodobienstwo", "Prawdopodobienstwo calkowite", "P(A)=\\sum_{i=1}^{n}P(A|B_i)P(B_i)", "P(A)=sum P(A|Bi)P(Bi)", ["calkowite"]],
  ["Prawdopodobienstwo", "Twierdzenie Bayesa", "P(B_k|A)=\\frac{P(B_k)P(A|B_k)}{\\sum_{i=1}^{n}P(A|B_i)P(B_i)}", "P(Bk|A)=P(Bk)P(A|Bk)/sum P(A|Bi)P(Bi)", ["bayes"]],
  ["Prawdopodobienstwo", "Wartosc oczekiwana", "E(X)=\\sum_{i=1}^{n}x_i p_i", "E(X)=sum x_i p_i", ["wartosc oczekiwana"]],
  ["Statystyka", "Srednia arytmetyczna", "\\bar{x}=\\frac{x_1+x_2+\\dots+x_n}{n}", "xbar=(x1+...+xn)/n", ["srednia"]],
  ["Statystyka", "Srednia geometryczna", "G=\\sqrt[n]{x_1x_2\\dots x_n}", "G=root(n,x1...xn)", ["srednia"]],
  ["Statystyka", "Srednia kwadratowa", "Q=\\sqrt{\\frac{x_1^2+x_2^2+\\dots+x_n^2}{n}}", "Q=sqrt((x1^2+...+xn^2)/n)", ["srednia"]],
  ["Statystyka", "Nierownosc srednich", "Q\\ge \\bar{x}\\ge G", "Q >= xbar >= G", ["srednia"]],
  ["Statystyka", "Srednia wazona", "\\bar{x}_w=\\frac{w_1x_1+w_2x_2+\\dots+w_nx_n}{w_1+w_2+\\dots+w_n}", "xw=(w1x1+...+wnxn)/(w1+...+wn)", ["srednia"]],
  ["Statystyka", "Wariancja", "\\sigma^2=\\frac{(x_1-\\bar{x})^2+\\dots+(x_n-\\bar{x})^2}{n}", "sigma^2=((x1-xbar)^2+...+(xn-xbar)^2)/n", ["wariancja"]],
  ["Statystyka", "Wariancja skrocona", "\\sigma^2=\\frac{x_1^2+x_2^2+\\dots+x_n^2}{n}-\\bar{x}^2", "sigma^2=(x1^2+...+xn^2)/n-xbar^2", ["wariancja"]],
  ["Statystyka", "Odchylenie standardowe", "\\sigma=\\sqrt{\\sigma^2}", "sigma=sqrt(sigma^2)", ["odchylenie"]],
  ["Pochodne", "Pochodna stalej", "(c)'=0", "(c)'=0", ["pochodna"]],
  ["Pochodne", "Pochodna liniowej", "(ax+b)'=a", "(ax+b)'=a", ["pochodna"]],
  ["Pochodne", "Pochodna kwadratowej", "(ax^2+bx+c)'=2ax+b", "(ax^2+bx+c)'=2ax+b", ["pochodna"]],
  ["Pochodne", "Pochodna odwrotnosci", "\\left(\\frac{a}{x}\\right)'=-\\frac{a}{x^2}", "(a/x)'=-a/x^2", ["pochodna"]],
  ["Pochodne", "Rownanie stycznej", "y=f'(x_0)(x-x_0)+f(x_0)", "y=f'(x0)(x-x0)+f(x0)", ["pochodna"]],
];

const pdfLiteralSeeds: Seed[] = [
  ["Wartosc bezwzgledna", "Nieujemnosc modulu", "|x|\\ge 0", "|x|>=0", ["modul", "wartosc bezwzgledna"]],
  ["Wartosc bezwzgledna", "Warunek zerowy modulu", "|x|=0 \\iff x=0", "|x|=0 iff x=0", ["modul", "wartosc bezwzgledna"]],
  ["Wartosc bezwzgledna", "Symetria modulu", "|-x|=|x|", "|-x|=|x|", ["modul"]],
  ["Wartosc bezwzgledna", "Nierownosc dla roznicy", "|x-y|\\le |x|+|y|", "|x-y|<=|x|+|y|", ["modul", "nierownosc"]],
  ["Wartosc bezwzgledna", "Przedzial opisany modulem", "|x-a|\\le r \\iff a-r\\le x\\le a+r", "|x-a|<=r iff a-r<=x<=a+r", ["modul", "nierownosc"]],
  ["Wartosc bezwzgledna", "Zbior poza przedzialem", "|x-a|\\ge r \\iff x\\le a-r \\lor x\\ge a+r", "|x-a|>=r iff x<=a-r or x>=a+r", ["modul", "nierownosc"]],
  ["Potegi i pierwiastki", "Definicja potegi naturalnej", "a^n=\\underbrace{a\\cdot a\\cdot \\ldots \\cdot a}_{n\\text{ razy}}", "a^n = a*a*...*a", ["potega"]],
  ["Potegi i pierwiastki", "Mnozenie poteg", "a^r\\cdot a^s=a^{r+s}", "a^r*a^s=a^(r+s)", ["potega"]],
  ["Potegi i pierwiastki", "Iloraz poteg", "\\frac{a^r}{a^s}=a^{r-s}", "a^r/a^s=a^(r-s)", ["potega"]],
  ["Potegi i pierwiastki", "Potega potegi", "\\left(a^r\\right)^s=a^{rs}", "(a^r)^s=a^(rs)", ["potega"]],
  ["Potegi i pierwiastki", "Potega iloczynu", "(ab)^r=a^rb^r", "(ab)^r=a^rb^r", ["potega"]],
  ["Potegi i pierwiastki", "Potega ilorazu", "\\left(\\frac{a}{b}\\right)^r=\\frac{a^r}{b^r}", "(a/b)^r=a^r/b^r", ["potega"]],
  ["Logarytmy", "Definicja logarytmu", "\\log_a b=c \\iff a^c=b", "log_a(b)=c iff a^c=b", ["logarytm"]],
  ["Logarytmy", "Potegowanie logarytmu", "a^{\\log_a b}=b", "a^(log_a(b))=b", ["logarytm"]],
  ["Logarytmy", "Odwrotnosc zmiany podstawy", "\\log_a b=\\frac{1}{\\log_b a}", "log_a(b)=1/log_b(a)", ["logarytm"]],
  ["Silnia i dwumian", "Rekurencja silni", "(n+1)!=n!(n+1)", "(n+1)!=n!(n+1)", ["silnia"]],
  ["Silnia i dwumian", "Wspolczynnik dwumianowy", "\\binom{n}{k}=\\frac{n!}{k!(n-k)!}", "binom(n,k)=n!/(k!(n-k)!)", ["dwumian", "newton"]],
  ["Silnia i dwumian", "Symetria symbolu Newtona", "\\binom{n}{k}=\\binom{n}{n-k}", "binom(n,k)=binom(n,n-k)", ["dwumian", "newton"]],
  ["Silnia i dwumian", "Tozsamosc Pascala", "\\binom{n}{k}+\\binom{n}{k+1}=\\binom{n+1}{k+1}", "binom(n,k)+binom(n,k+1)=binom(n+1,k+1)", ["dwumian", "newton"]],
  ["Wzor Newtona", "Wzor dwumianowy Newtona", "(a+b)^n=\\sum_{k=0}^{n}\\binom{n}{k}a^{n-k}b^k", "(a+b)^n=sum_{k=0}^n binom(n,k)a^(n-k)b^k", ["dwumian", "newton"]],
  ["Wzor Newtona", "Dwumian z roznica", "(a-b)^n=\\sum_{k=0}^{n}(-1)^k\\binom{n}{k}a^{n-k}b^k", "(a-b)^n=sum_{k=0}^n (-1)^k binom(n,k)a^(n-k)b^k", ["dwumian", "newton"]],
  ["Wzory skroconego mnozenia", "Kwadrat sumy", "(a+b)^2=a^2+2ab+b^2", "(a+b)^2=a^2+2ab+b^2", ["algebra"]],
  ["Wzory skroconego mnozenia", "Kwadrat roznicy", "(a-b)^2=a^2-2ab+b^2", "(a-b)^2=a^2-2ab+b^2", ["algebra"]],
  ["Wzory skroconego mnozenia", "Roznica kwadratow", "(a+b)(a-b)=a^2-b^2", "(a+b)(a-b)=a^2-b^2", ["algebra"]],
  ["Wzory skroconego mnozenia", "Szescian sumy", "(a+b)^3=a^3+3a^2b+3ab^2+b^3", "(a+b)^3=a^3+3a^2b+3ab^2+b^3", ["algebra"]],
  ["Wzory skroconego mnozenia", "Szescian roznicy", "(a-b)^3=a^3-3a^2b+3ab^2-b^3", "(a-b)^3=a^3-3a^2b+3ab^2-b^3", ["algebra"]],
  ["Wzory skroconego mnozenia", "Roznica n-tych poteg", "a^n-b^n=(a-b)(a^{n-1}+a^{n-2}b+\\dots+ab^{n-2}+b^{n-1})", "a^n-b^n=(a-b)(a^(n-1)+...+b^(n-1))", ["algebra"]],
  ["Funkcja kwadratowa", "Miejsca zerowe trojmianu", "x_{1,2}=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}", "x1,2=(-b+-sqrt(Delta))/(2a)", ["kwadratowa"]],
  ["Funkcja kwadratowa", "Os symetrii paraboli", "x=-\\frac{b}{2a}", "x=-b/(2a)", ["kwadratowa"]],
  ["Funkcja kwadratowa", "Wspolrzedne wierzcholka paraboli", "W=\\left(-\\frac{b}{2a},-\\frac{\\Delta}{4a}\\right)", "W=(-b/(2a),-Delta/(4a))", ["kwadratowa"]],
  ["Ciagi", "Srednia arytmetyczna sasiadow", "2a_{n+1}=a_n+a_{n+2}", "2a_(n+1)=a_n+a_(n+2)", ["ciag", "arytmetyczny"]],
  ["Ciagi", "Srednia geometryczna sasiadow", "a_{n+1}^2=a_na_{n+2}", "a_(n+1)^2=a_n a_(n+2)", ["ciag", "geometryczny"]],
  ["Granice ciagow", "Granica sumy", "\\lim_{n\\to\\infty}(a_n+b_n)=a+b", "lim(a_n+b_n)=a+b", ["granica"]],
  ["Granice ciagow", "Granica roznicy", "\\lim_{n\\to\\infty}(a_n-b_n)=a-b", "lim(a_n-b_n)=a-b", ["granica"]],
  ["Granice ciagow", "Granica iloczynu", "\\lim_{n\\to\\infty}(a_nb_n)=ab", "lim(a_n b_n)=ab", ["granica"]],
  ["Granice ciagow", "Granica ilorazu", "\\lim_{n\\to\\infty}\\frac{a_n}{b_n}=\\frac{a}{b}", "lim(a_n/b_n)=a/b", ["granica"]],
  ["Granice ciagow", "Twierdzenie o trzech ciagach", "a_n\\le b_n\\le c_n \\land \\lim a_n=\\lim c_n=g \\Rightarrow \\lim b_n=g", "a_n<=b_n<=c_n and lim a_n=lim c_n=g => lim b_n=g", ["granica"]],
  ["Granice ciagow", "Granica geometryczna", "|q|<1 \\Rightarrow \\lim_{n\\to\\infty}q^n=0", "|q|<1 => lim q^n = 0", ["granica", "ciag"]],
  ["Trygonometria", "Definicja sinusa w trojkacie", "\\sin\\alpha=\\frac{a}{c}", "sin(alpha)=a/c", ["trygonometria"]],
  ["Trygonometria", "Definicja cosinusa w trojkacie", "\\cos\\alpha=\\frac{b}{c}", "cos(alpha)=b/c", ["trygonometria"]],
  ["Trygonometria", "Definicja tangensa w trojkacie", "\\tan\\alpha=\\frac{a}{b}", "tan(alpha)=a/b", ["trygonometria"]],
  ["Trygonometria", "Definicja cotangensa w trojkacie", "\\cot\\alpha=\\frac{b}{a}", "cot(alpha)=b/a", ["trygonometria"]],
  ["Trygonometria", "Iloraz sinusa i cosinusa", "\\tan\\alpha=\\frac{\\sin\\alpha}{\\cos\\alpha}", "tan(alpha)=sin(alpha)/cos(alpha)", ["trygonometria"]],
  ["Trygonometria", "Iloraz cosinusa i sinusa", "\\cot\\alpha=\\frac{\\cos\\alpha}{\\sin\\alpha}", "cot(alpha)=cos(alpha)/sin(alpha)", ["trygonometria"]],
  ["Trygonometria", "Parzystosc cosinusa", "\\cos(-\\alpha)=\\cos\\alpha", "cos(-alpha)=cos(alpha)", ["trygonometria"]],
  ["Trygonometria", "Nieparzystosc sinusa", "\\sin(-\\alpha)=-\\sin\\alpha", "sin(-alpha)=-sin(alpha)", ["trygonometria"]],
  ["Trygonometria", "Nieparzystosc tangensa", "\\tan(-\\alpha)=-\\tan\\alpha", "tan(-alpha)=-tan(alpha)", ["trygonometria"]],
  ["Trygonometria", "Nieparzystosc cotangensa", "\\cot(-\\alpha)=-\\cot\\alpha", "cot(-alpha)=-cot(alpha)", ["trygonometria"]],
  ["Trygonometria", "Okresowosc sinusa", "\\sin(\\alpha+2k\\pi)=\\sin\\alpha", "sin(alpha+2kpi)=sin(alpha)", ["trygonometria", "okresowosc"]],
  ["Trygonometria", "Okresowosc cosinusa", "\\cos(\\alpha+2k\\pi)=\\cos\\alpha", "cos(alpha+2kpi)=cos(alpha)", ["trygonometria", "okresowosc"]],
  ["Trygonometria", "Okresowosc tangensa", "\\tan(\\alpha+k\\pi)=\\tan\\alpha", "tan(alpha+kpi)=tan(alpha)", ["trygonometria", "okresowosc"]],
  ["Trygonometria", "Okresowosc cotangensa", "\\cot(\\alpha+k\\pi)=\\cot\\alpha", "cot(alpha+kpi)=cot(alpha)", ["trygonometria", "okresowosc"]],
  ["Trygonometria", "Cosinus roznicy", "\\cos(\\alpha-\\beta)=\\cos\\alpha\\cos\\beta+\\sin\\alpha\\sin\\beta", "cos(alpha-beta)=cos(alpha)cos(beta)+sin(alpha)sin(beta)", ["trygonometria"]],
  ["Pochodne", "Pochodna sumy", "(f+g)'=f'+g'", "(f+g)'=f'+g'", ["pochodna"]],
  ["Pochodne", "Pochodna roznicy", "(f-g)'=f'-g'", "(f-g)'=f'-g'", ["pochodna"]],
  ["Pochodne", "Pochodna iloczynu", "(fg)'=f'g+fg'", "(fg)'=f'g+fg'", ["pochodna"]],
  ["Pochodne", "Pochodna ilorazu", "\\left(\\frac{f}{g}\\right)'=\\frac{f'g-fg'}{g^2}", "(f/g)'=(f'g-fg')/g^2", ["pochodna"]],
  ["Pochodne", "Pochodna funkcji zlozonej", "(g\\circ f)'(x)=g'(f(x))\\cdot f'(x)", "(g o f)'(x)=g'(f(x))f'(x)", ["pochodna", "lancuchowa"]],
];

const formulaLibrary = fromSeeds([...coreSeeds, ...pdfSeeds, ...pdfLiteralSeeds]);

const derivativeSeeds = [
  ["sin", "\\frac{d}{dx}\\sin x = \\cos x", "d/dx sin x = cos x"],
  ["cos", "\\frac{d}{dx}\\cos x = -\\sin x", "d/dx cos x = -sin x"],
  ["tan", "\\frac{d}{dx}\\tan x = \\sec^2 x", "d/dx tan x = sec^2 x"],
  ["cot", "\\frac{d}{dx}\\cot x = -\\csc^2 x", "d/dx cot x = -csc^2 x"],
  ["sec", "\\frac{d}{dx}\\sec x = \\sec x\\tan x", "d/dx sec x = sec x tan x"],
  ["csc", "\\frac{d}{dx}\\csc x = -\\csc x\\cot x", "d/dx csc x = -csc x cot x"],
  ["ln", "\\frac{d}{dx}\\ln x = \\frac{1}{x}", "d/dx ln x = 1/x"],
  ["exp", "\\frac{d}{dx}e^x = e^x", "d/dx e^x = e^x"],
  ["sqrt", "\\frac{d}{dx}\\sqrt{x} = \\frac{1}{2\\sqrt{x}}", "d/dx sqrt(x) = 1/(2sqrt(x))"],
  ["asin", "\\frac{d}{dx}\\arcsin x = \\frac{1}{\\sqrt{1-x^2}}", "d/dx asin x = 1/sqrt(1-x^2)"],
  ["acos", "\\frac{d}{dx}\\arccos x = -\\frac{1}{\\sqrt{1-x^2}}", "d/dx acos x = -1/sqrt(1-x^2)"],
  ["atan", "\\frac{d}{dx}\\arctan x = \\frac{1}{1+x^2}", "d/dx atan x = 1/(1+x^2)"],
  ["sinh", "\\frac{d}{dx}\\sinh x = \\cosh x", "d/dx sinh x = cosh x"],
  ["cosh", "\\frac{d}{dx}\\cosh x = \\sinh x", "d/dx cosh x = sinh x"],
  ["tanh", "\\frac{d}{dx}\\tanh x = \\operatorname{sech}^2 x", "d/dx tanh x = sech^2 x"],
];

const integralSeeds = [
  ["sin", "\\int \\sin x\\,dx = -\\cos x + C", "int sin x dx = -cos x + C"],
  ["cos", "\\int \\cos x\\,dx = \\sin x + C", "int cos x dx = sin x + C"],
  ["tan", "\\int \\tan x\\,dx = -\\ln|\\cos x| + C", "int tan x dx = -ln|cos x| + C"],
  ["cot", "\\int \\cot x\\,dx = \\ln|\\sin x| + C", "int cot x dx = ln|sin x| + C"],
  ["sec", "\\int \\sec x\\,dx = \\ln|\\sec x+\\tan x| + C", "int sec x dx = ln|sec x+tan x| + C"],
  ["csc", "\\int \\csc x\\,dx = \\ln|\\csc x-\\cot x| + C", "int csc x dx = ln|csc x-cot x| + C"],
  ["exp", "\\int e^x\\,dx = e^x + C", "int e^x dx = e^x + C"],
  ["ln", "\\int \\frac{1}{x}\\,dx = \\ln|x| + C", "int 1/x dx = ln|x| + C"],
  ["sqrt", "\\int x^{1/2}\\,dx = \\frac{2}{3}x^{3/2} + C", "int sqrt(x) dx = 2/3 x^(3/2)+C"],
  ["asin", "\\int \\frac{1}{\\sqrt{1-x^2}}\\,dx = \\arcsin x + C", "int 1/sqrt(1-x^2) dx = asin x + C"],
  ["atan", "\\int \\frac{1}{1+x^2}\\,dx = \\arctan x + C", "int 1/(1+x^2) dx = atan x + C"],
  ["sinh", "\\int \\sinh x\\,dx = \\cosh x + C", "int sinh x dx = cosh x + C"],
  ["cosh", "\\int \\cosh x\\,dx = \\sinh x + C", "int cosh x dx = sinh x + C"],
];

for (let power = 0; power <= 20; power += 1) {
  formulaLibrary.push(
    entry(
      "Pochodne potegowe",
      `Pochodna x^${power}`,
      `\\frac{d}{dx}x^{${power}} = ${power === 0 ? "0" : `${power}x^{${Math.max(power - 1, 0)}}`}`,
      `d/dx x^${power} = ${power === 0 ? "0" : `${power}x^${Math.max(power - 1, 0)}`}`,
      ["pochodne", "potegowa"],
    ),
  );
}

for (let power = 0; power <= 20; power += 1) {
  formulaLibrary.push(
    entry(
      "Calki potegowe",
      `Calka x^${power}`,
      `\\int x^{${power}}\\,dx = \\frac{x^{${power + 1}}}{${power + 1}} + C`,
      `int x^${power} dx = x^${power + 1}/${power + 1} + C`,
      ["calki", "potegowa"],
    ),
  );
}

for (const [name, latex, plain] of derivativeSeeds) {
  formulaLibrary.push(entry("Pochodne funkcji", `Pochodna ${name}`, latex, plain, ["pochodna", name]));
  formulaLibrary.push(
    entry(
      "Reguly pochodnych",
      `Regula lancuchowa dla ${name}`,
      `\\frac{d}{dx}${name === "ln" ? "\\ln" : name === "exp" ? "e^{u(x)}" : `\\operatorname{${name}}`}\\left(u(x)\\right)`,
      `chain rule for ${name}(u(x))`,
      ["pochodna", "lancuchowa", name],
    ),
  );
}

for (const [name, latex, plain] of integralSeeds) {
  formulaLibrary.push(entry("Calki funkcji", `Calka ${name}`, latex, plain, ["calka", name]));
}

const commonAngles = [
  ["0", "0", "1", "0", "\\text{nie istnieje}"],
  ["30^\\circ", "\\frac{1}{2}", "\\frac{\\sqrt{3}}{2}", "\\frac{1}{\\sqrt{3}}", "\\sqrt{3}"],
  ["45^\\circ", "\\frac{\\sqrt{2}}{2}", "\\frac{\\sqrt{2}}{2}", "1", "1"],
  ["60^\\circ", "\\frac{\\sqrt{3}}{2}", "\\frac{1}{2}", "\\sqrt{3}", "\\frac{1}{\\sqrt{3}}"],
  ["90^\\circ", "1", "0", "\\text{nie istnieje}", "0"],
];

for (const [angle, sinValue, cosValue, tanValue, cotValue] of commonAngles) {
  formulaLibrary.push(entry("Wartosci szczegolne", `Sinus ${angle}`, `\\sin ${angle} = ${sinValue}`, `sin ${angle} = ${sinValue}`, ["wartosci", "sin"]));
  formulaLibrary.push(entry("Wartosci szczegolne", `Cosinus ${angle}`, `\\cos ${angle} = ${cosValue}`, `cos ${angle} = ${cosValue}`, ["wartosci", "cos"]));
  formulaLibrary.push(entry("Wartosci szczegolne", `Tangens ${angle}`, `\\tan ${angle} = ${tanValue}`, `tan ${angle} = ${tanValue}`, ["wartosci", "tan"]));
  formulaLibrary.push(entry("Wartosci szczegolne", `Cotangens ${angle}`, `\\cot ${angle} = ${cotValue}`, `cot ${angle} = ${cotValue}`, ["wartosci", "cot"]));
}

for (let n = 1; n <= 8; n += 1) {
  formulaLibrary.push(
    entry(
      "Okresowosc trygonometryczna",
      `Sinus z przesunieciem ${2 * n}\\pi`,
      `\\sin\\left(x+${2 * n}\\pi\\right)=\\sin x`,
      `sin(x+${2 * n}pi)=sin(x)`,
      ["tryg", "okresowosc", "sin"],
    ),
  );
  formulaLibrary.push(
    entry(
      "Okresowosc trygonometryczna",
      `Cosinus z przesunieciem ${2 * n}\\pi`,
      `\\cos\\left(x+${2 * n}\\pi\\right)=\\cos x`,
      `cos(x+${2 * n}pi)=cos(x)`,
      ["tryg", "okresowosc", "cos"],
    ),
  );
  formulaLibrary.push(
    entry(
      "Okresowosc trygonometryczna",
      `Tangens z przesunieciem ${n}\\pi`,
      `\\tan\\left(x+${n}\\pi\\right)=\\tan x`,
      `tan(x+${n}pi)=tan(x)`,
      ["tryg", "okresowosc", "tan"],
    ),
  );
  formulaLibrary.push(
    entry(
      "Okresowosc trygonometryczna",
      `Cotangens z przesunieciem ${n}\\pi`,
      `\\cot\\left(x+${n}\\pi\\right)=\\cot x`,
      `cot(x+${n}pi)=cot(x)`,
      ["tryg", "okresowosc", "cot"],
    ),
  );
}

for (let n = 1; n <= 16; n += 1) {
  formulaLibrary.push(
    entry(
      "Kombinatoryka",
      `Dwumian Newtona dla n=${n}`,
      `(a+b)^{${n}} = \\sum_{k=0}^{${n}} \\binom{${n}}{k} a^{${n}-k} b^k`,
      `(a+b)^${n} = sum_{k=0}^${n} C(${n},k)a^(${n}-k)b^k`,
      ["newton", "kombinatoryka"],
    ),
  );
}

const sheetLiteralExtraSeeds: Seed[] = [
  ["Trygonometria", "Sinus roznicy", "\\sin(\\alpha-\\beta)=\\sin\\alpha\\cos\\beta-\\cos\\alpha\\sin\\beta", "sin(alpha-beta)=sin(alpha)cos(beta)-cos(alpha)sin(beta)", ["trygonometria"]],
  ["Trygonometria", "Tangens sumy", "\\tan(\\alpha+\\beta)=\\frac{\\tan\\alpha+\\tan\\beta}{1-\\tan\\alpha\\tan\\beta}", "tan(alpha+beta)=(tan(alpha)+tan(beta))/(1-tan(alpha)tan(beta))", ["trygonometria"]],
  ["Trygonometria", "Tangens roznicy", "\\tan(\\alpha-\\beta)=\\frac{\\tan\\alpha-\\tan\\beta}{1+\\tan\\alpha\\tan\\beta}", "tan(alpha-beta)=(tan(alpha)-tan(beta))/(1+tan(alpha)tan(beta))", ["trygonometria"]],
  ["Trygonometria", "Cosinus podwojnego kata przez cosinus", "\\cos 2\\alpha = 2\\cos^2\\alpha - 1", "cos(2alpha)=2cos^2(alpha)-1", ["trygonometria"]],
  ["Trygonometria", "Cosinus podwojnego kata przez sinus", "\\cos 2\\alpha = 1 - 2\\sin^2\\alpha", "cos(2alpha)=1-2sin^2(alpha)", ["trygonometria"]],
  ["Trygonometria", "Sinus przesuniecia o pi", "\\sin(\\pi-\\alpha)=\\sin\\alpha", "sin(pi-alpha)=sin(alpha)", ["trygonometria", "redukcja"]],
  ["Trygonometria", "Cosinus przesuniecia o pi", "\\cos(\\pi-\\alpha)=-\\cos\\alpha", "cos(pi-alpha)=-cos(alpha)", ["trygonometria", "redukcja"]],
  ["Trygonometria", "Sinus przesuniecia o pol pi", "\\sin\\left(\\frac{\\pi}{2}+\\alpha\\right)=\\cos\\alpha", "sin(pi/2+alpha)=cos(alpha)", ["trygonometria", "redukcja"]],
  ["Trygonometria", "Cosinus przesuniecia o pol pi", "\\cos\\left(\\frac{\\pi}{2}+\\alpha\\right)=-\\sin\\alpha", "cos(pi/2+alpha)=-sin(alpha)", ["trygonometria", "redukcja"]],
  ["Planimetria", "Twierdzenie o dwusiecznej kata", "\\frac{|AD|}{|DB|}=\\frac{|AC|}{|CB|}", "|AD|/|DB|=|AC|/|CB|", ["planimetria", "dwusieczna"]],
  ["Planimetria", "Kat wpisany i srodkowy", "|\\angle ACB|=\\frac{1}{2}|\\angle AOB|", "|angle ACB|=|angle AOB|/2", ["okrag", "planimetria"]],
  ["Planimetria", "Kat miedzy styczna i cieciwa", "|\\angle GAB|=|\\angle ACB|", "|angle GAB|=|angle ACB|", ["okrag", "styczna"]],
  ["Planimetria", "Twierdzenie o odcinkach stycznych", "|PA|=|PB|", "|PA|=|PB|", ["okrag", "styczna"]],
  ["Planimetria", "Twierdzenie o siecznej i stycznej", "|PA|\\cdot|PB|=|PC|^2", "|PA|*|PB|=|PC|^2", ["okrag", "sieczna", "styczna"]],
  ["Czworokaty", "Okrag wpisany w czworokat", "a+c=b+d", "a+c=b+d", ["czworokat", "okrag wpisany"]],
  ["Podobienstwo", "Pola figur podobnych", "\\frac{P_1}{P_2}=k^2", "P1/P2=k^2", ["podobienstwo", "pole"]],
  ["Geometria analityczna", "Wektor AB", "\\vec{AB}=[x_B-x_A,\\ y_B-y_A]", "AB=[xB-xA,yB-yA]", ["wektor"]],
  ["Geometria analityczna", "Dodawanie wektorow", "[u_1,u_2]+[v_1,v_2]=[u_1+v_1,u_2+v_2]", "[u1,u2]+[v1,v2]=[u1+v1,u2+v2]", ["wektor"]],
  ["Geometria analityczna", "Mnozenie wektora przez skalar", "a[u_1,u_2]=[au_1,au_2]", "a[u1,u2]=[au1,au2]", ["wektor"]],
  ["Geometria analityczna", "Dlugosc wektora", "|\\vec{u}|=\\sqrt{u_1^2+u_2^2}", "|u|=sqrt(u1^2+u2^2)", ["wektor"]],
  ["Geometria analityczna", "Przesuniecie o wektor", "(x,y)\\mapsto(x+a,y+b)", "(x,y)->(x+a,y+b)", ["wektor", "przesuniecie"]],
  ["Geometria analityczna", "Symetria wzgledem osi OX", "(x,y)\\mapsto(x,-y)", "(x,y)->(x,-y)", ["symetria"]],
  ["Geometria analityczna", "Symetria wzgledem osi OY", "(x,y)\\mapsto(-x,y)", "(x,y)->(-x,y)", ["symetria"]],
  ["Geometria analityczna", "Symetria srodkowa", "(x,y)\\mapsto(2a-x,2b-y)", "(x,y)->(2a-x,2b-y)", ["symetria"]],
  ["Geometria analityczna", "Srodek ciezkosci trojkata", "G=\\left(\\frac{x_A+x_B+x_C}{3},\\frac{y_A+y_B+y_C}{3}\\right)", "G=((xA+xB+xC)/3,(yA+yB+yC)/3)", ["trojkat", "srodek ciezkosci"]],
  ["Stereometria", "Twierdzenie o trzech prostych prostopadlych", "m\\perp k \\iff m\\perp l", "m perpendicular k iff m perpendicular l", ["stereometria", "prostopadle"]],
  ["Stereometria", "Pole calkowite prostopadloscianu", "P_c=2(ab+bc+ca)", "P_c=2(ab+bc+ca)", ["prostopadloscian"]],
  ["Stereometria", "Pole boczne graniastoslupa prostego", "P_b=O_p h", "P_b=O_p h", ["graniastoslup"]],
  ["Stereometria", "Objetosc graniastoslupa prostego", "V=P_p h", "V=P_p h", ["graniastoslup"]],
  ["Stereometria", "Objetosc ostroslupa", "V=\\frac{1}{3}P_p h", "V=P_p h/3", ["ostroslup"]],
  ["Stereometria", "Pole boczne walca", "P_b=2\\pi rh", "P_b=2pi rh", ["walec"]],
  ["Stereometria", "Pole calkowite walca", "P_c=2\\pi r(r+h)", "P_c=2pi r(r+h)", ["walec"]],
  ["Stereometria", "Pole boczne stozka", "P_b=\\pi rl", "P_b=pi rl", ["stozek"]],
  ["Stereometria", "Pole calkowite stozka", "P_c=\\pi r(r+l)", "P_c=pi r(r+l)", ["stozek"]],
  ["Prawdopodobienstwo", "Monotonicznosc prawdopodobienstwa", "A\\subset B \\Rightarrow P(A)\\le P(B)", "A subset B => P(A)<=P(B)", ["prawdopodobienstwo"]],
  ["Prawdopodobienstwo", "Prawdopodobienstwo sumy zdarzen", "P(A\\cup B)=P(A)+P(B)-P(A\\cap B)", "P(AuB)=P(A)+P(B)-P(AnB)", ["prawdopodobienstwo"]],
  ["Prawdopodobienstwo", "Prawdopodobienstwo zdarzenia przeciwnego", "P(A')=1-P(A)", "P(A')=1-P(A)", ["prawdopodobienstwo"]],
  ["Statystyka", "Mediana dla nieparzystej liczby danych", "\\operatorname{Me}=x_{\\frac{n+1}{2}}", "Me=x_((n+1)/2)", ["statystyka", "mediana"]],
  ["Statystyka", "Mediana dla parzystej liczby danych", "\\operatorname{Me}=\\frac{x_{n/2}+x_{n/2+1}}{2}", "Me=(x_(n/2)+x_(n/2+1))/2", ["statystyka", "mediana"]],
  ["Statystyka", "Wariancja", "\\sigma^2=\\frac{(x_1-\\bar{x})^2+\\dots+(x_n-\\bar{x})^2}{n}", "sigma^2=((x1-xbar)^2+...+(xn-xbar)^2)/n", ["statystyka", "wariancja"]],
  ["Statystyka", "Odchylenie standardowe", "\\sigma=\\sqrt{\\sigma^2}", "sigma=sqrt(sigma^2)", ["statystyka", "odchylenie"]],
  ["Pochodne", "Pochodna iloczynu funkcji", "(f\\cdot g)'=f'g+fg'", "(f*g)'=f'g+fg'", ["pochodna"]],
  ["Pochodne", "Pochodna ilorazu funkcji", "\\left(\\frac{f}{g}\\right)'=\\frac{f'g-fg'}{g^2}", "(f/g)'=(f'g-fg')/g^2", ["pochodna"]],
  ["Pochodne", "Pochodna funkcji zlozonej", "(g\\circ f)'(x)=g'(f(x))\\cdot f'(x)", "(g o f)'(x)=g'(f(x))*f'(x)", ["pochodna", "lancuchowa"]],
  ["Pochodne", "Rownanie stycznej", "y=f'(x_0)(x-x_0)+f(x_0)", "y=f'(x0)(x-x0)+f(x0)", ["pochodna", "styczna"]],
];

formulaLibrary.push(...fromSeeds(sheetLiteralExtraSeeds));

export const FORMULA_LIBRARY = formulaLibrary;
export const FORMULA_COUNT = FORMULA_LIBRARY.length;
export const FORMULA_CATEGORIES = Array.from(new Set(FORMULA_LIBRARY.map((item) => item.category))).sort();

function byTitle(title: string): FormulaEntry {
  const found = FORMULA_LIBRARY.find((item) => item.title === title);
  if (!found) {
    throw new Error(`Brakuje wzoru o tytule: ${title}`);
  }
  return found;
}

function page(pageNumber: number, heading: string, titles: string[]): FormulaPage {
  return {
    page: pageNumber,
    heading,
    formulas: titles.map(byTitle),
  };
}

export const FORMULA_SHEET_PAGES: FormulaPage[] = [
  page(4, "Strona 4 • Wartość bezwzględna liczby • Potęgi i pierwiastki", [
    "Definicja wartosci bezwzglednej",
    "Nieujemnosc modulu",
    "Warunek zerowy modulu",
    "Symetria modulu",
    "Nierownosc trojkata",
    "Nierownosc dla roznicy",
    "Iloczyn modulow",
    "Iloraz modulow",
    "Przedzial opisany modulem",
    "Zbior poza przedzialem",
    "Definicja potegi naturalnej",
    "Pierwiastek kwadratowy",
  ]),
  page(5, "Strona 5 • Potęgi, pierwiastki i logarytmy", [
    "Potega ujemna",
    "Potega ulamkowa",
    "Dodawanie wykladnikow",
    "Iloraz poteg",
    "Potega potegi",
    "Potega iloczynu",
    "Potega ilorazu",
    "Definicja logarytmu",
    "Logarytm iloczynu",
    "Logarytm ilorazu",
    "Logarytm potegi",
  ]),
  page(6, "Strona 6 • Logarytmy • Silnia • Współczynnik dwumianowy", [
    "Zmiana podstawy",
    "Odwrotnosc zmiany podstawy",
    "Rekurencja silni",
    "Wspolczynnik dwumianowy",
    "Symetria symbolu Newtona",
    "Tozsamosc Pascala",
  ]),
  page(7, "Strona 7 • Wzór Newtona • Wzory skróconego mnożenia • Funkcja kwadratowa", [
    "Wzor dwumianowy Newtona",
    "Dwumian z roznica",
    "Kwadrat sumy",
    "Kwadrat roznicy",
    "Roznica kwadratow",
    "Szescian sumy",
    "Szescian roznicy",
    "Roznica n-tych poteg",
    "Delta",
  ]),
  page(8, "Strona 8 • Funkcja kwadratowa", [
    "Miejsca zerowe trojmianu",
    "Os symetrii paraboli",
    "Wspolrzedne wierzcholka paraboli",
    "Postac kanoniczna",
    "Postac iloczynowa",
    "Wzory Viete'a",
  ]),
  page(9, "Strona 9 • Ciągi", [
    "Wyraz ciagu arytmetycznego",
    "Suma ciagu arytmetycznego",
    "Srednia arytmetyczna sasiadow",
    "Wyraz ciagu geometrycznego",
    "Suma ciagu geometrycznego",
  ]),
  page(10, "Strona 10 • Ciągi, granice i procent składany", [
    "Srednia geometryczna sasiadow",
    "Suma nieskonczonego geometrycznego",
    "Granica sumy",
    "Granica roznicy",
    "Granica iloczynu",
    "Granica ilorazu",
    "Twierdzenie o trzech ciagach",
    "Granica geometryczna",
    "Kapital koncowy",
  ]),
  page(11, "Strona 11 • Wybrane granice • Trygonometria", [
    "Granica liczby e",
    "Granica pierwiastka n-tego",
    "Definicja sinusa w trojkacie",
    "Definicja cosinusa w trojkacie",
    "Definicja tangensa w trojkacie",
    "Definicja cotangensa w trojkacie",
  ]),
  page(12, "Strona 12 • Związki między funkcjami trygonometrycznymi", [
    "Jedynka trygonometryczna",
    "Iloraz sinusa i cosinusa",
    "Iloraz cosinusa i sinusa",
    "Jedynka tangensowa",
    "Jedynka cotangensowa",
    "Parzystosc cosinusa",
    "Nieparzystosc sinusa",
    "Nieparzystosc tangensa",
    "Nieparzystosc cotangensa",
  ]),
  page(13, "Strona 13 • Wartości funkcji trygonometrycznych", [
    "Sinus 0",
    "Cosinus 0",
    "Tangens 0",
    "Sinus 30^\\circ",
    "Cosinus 30^\\circ",
    "Tangens 30^\\circ",
    "Sinus 45^\\circ",
    "Cosinus 45^\\circ",
    "Tangens 45^\\circ",
    "Sinus 60^\\circ",
    "Cosinus 60^\\circ",
    "Tangens 60^\\circ",
    "Sinus 90^\\circ",
    "Cosinus 90^\\circ",
  ]),
  page(14, "Strona 14 • Wzory trygonometryczne", [
    "Sinus sumy",
    "Sinus roznicy",
    "Cosinus sumy",
    "Cosinus roznicy",
    "Tangens sumy",
    "Tangens roznicy",
    "Sinus podwojnego kata",
    "Cosinus podwojnego kata",
    "Cosinus podwojnego kata przez cosinus",
    "Cosinus podwojnego kata przez sinus",
    "Tangens podwojnego kata",
    "Suma sinusow",
    "Suma cosinusow",
    "Iloczyn sinusow",
    "Iloczyn cosinusow",
  ]),
  page(15, "Strona 15 • Wzory redukcyjne i okresowość", [
    "Sinus przesuniecia o pi",
    "Cosinus przesuniecia o pi",
    "Sinus przesuniecia o pol pi",
    "Cosinus przesuniecia o pol pi",
    "Okresowosc sinusa",
    "Okresowosc cosinusa",
    "Okresowosc tangensa",
    "Okresowosc cotangensa",
  ]),
  page(16, "Strona 16 • Planimetria", [
    "Pole trojkata z wysokoscia",
    "Pole trojkata z sinusem",
    "Wzor Herona",
    "Pole trojkata przez promien opisany",
    "Pole trojkata przez promien wpisany",
    "Wysokosc w trojkacie rownobocznym",
    "Pole trojkata rownobocznego",
    "Promien wpisanego w rownobocznym",
    "Promien opisanego w rownobocznym",
    "Prawo sinusow",
    "Prawo cosinusow",
  ]),
  page(17, "Strona 17 • Twierdzenia w trójkątach i kole", [
    "Twierdzenie o dwusiecznej kata",
    "Twierdzenie Talesa",
    "Pole kola",
    "Obwod kola",
    "Pole wycinka kola",
    "Dlugosc luku",
  ]),
  page(18, "Strona 18 • Kąty w okręgu i styczne", [
    "Kat wpisany i srodkowy",
    "Kat miedzy styczna i cieciwa",
    "Twierdzenie o odcinkach stycznych",
    "Twierdzenie o siecznej i stycznej",
  ]),
  page(19, "Strona 19 • Czworokąty", [
    "Pole trapezu",
    "Pole rownolegloboku",
    "Pole rownolegloboku z sinusem",
    "Pole rombu",
    "Pole rombu przez przekatne",
    "Pole deltoidu",
  ]),
  page(20, "Strona 20 • Okręgi w czworokątach i podobieństwo", [
    "Warunek okregu opisanego",
    "Okrag wpisany w czworokat",
    "Pola figur podobnych",
  ]),
  page(21, "Strona 21 • Geometria analityczna na płaszczyźnie", [
    "Dlugosc odcinka",
    "Srodek odcinka",
    "Pole trojkata ze wspolrzednych",
  ]),
  page(22, "Strona 22 • Równania prostych", [
    "Rownanie kierunkowe prostej",
    "Prosta przez punkt",
    "Wspolczynnik kierunkowy",
    "Rownanie ogolne prostej",
  ]),
  page(23, "Strona 23 • Proste i okręgi", [
    "Proste rownolegle",
    "Proste prostopadle",
    "Odleglosc punktu od prostej",
    "Okrag w postaci kanonicznej",
  ]),
  page(24, "Strona 24 • Wektory i przekształcenia", [
    "Wektor AB",
    "Dodawanie wektorow",
    "Mnozenie wektora przez skalar",
    "Dlugosc wektora",
    "Przesuniecie o wektor",
    "Symetria wzgledem osi OX",
    "Symetria wzgledem osi OY",
    "Symetria srodkowa",
  ]),
  page(25, "Strona 25 • Pole i środek ciężkości trójkąta", [
    "Pole trojkata ze wspolrzednych",
    "Srodek ciezkosci trojkata",
  ]),
  page(26, "Strona 26 • Stereometria", [
    "Twierdzenie o trzech prostych prostopadlych",
    "Pole calkowite prostopadloscianu",
    "Objetosc prostopadloscianu",
  ]),
  page(27, "Strona 27 • Graniastosłupy, ostrosłupy, walce i stożki", [
    "Pole boczne graniastoslupa prostego",
    "Objetosc graniastoslupa prostego",
    "Objetosc ostroslupa",
    "Pole boczne walca",
    "Pole calkowite walca",
    "Objetosc walca",
    "Pole boczne stozka",
    "Pole calkowite stozka",
    "Objetosc stozka",
  ]),
  page(28, "Strona 28 • Kula i kombinatoryka", [
    "Pole powierzchni kuli",
    "Objetosc kuli",
    "Permutacje",
    "Kombinacje",
    "Wariacje z powtorzeniami",
    "Wariacje bez powtorzen",
  ]),
  page(29, "Strona 29 • Rachunek prawdopodobieństwa", [
    "Klasyczna definicja prawdopodobienstwa",
    "Monotonicznosc prawdopodobienstwa",
    "Prawdopodobienstwo zdarzenia przeciwnego",
    "Prawdopodobienstwo sumy zdarzen",
    "Schemat Bernoulliego",
  ]),
  page(30, "Strona 30 • Prawdopodobieństwo warunkowe i Bayes", [
    "Prawdopodobienstwo warunkowe",
    "Prawdopodobienstwo calkowite",
    "Twierdzenie Bayesa",
    "Wartosc oczekiwana",
  ]),
  page(31, "Strona 31 • Parametry danych statystycznych", [
    "Srednia arytmetyczna",
    "Srednia geometryczna",
    "Srednia kwadratowa",
    "Nierownosc srednich",
    "Srednia wazona",
  ]),
  page(32, "Strona 32 • Mediana, wariancja, odchylenie • Reguły pochodnych", [
    "Mediana dla nieparzystej liczby danych",
    "Mediana dla parzystej liczby danych",
    "Wariancja",
    "Wariancja skrocona",
    "Odchylenie standardowe",
    "Pochodna sumy",
    "Pochodna roznicy",
    "Pochodna iloczynu funkcji",
    "Pochodna ilorazu funkcji",
    "Pochodna funkcji zlozonej",
  ]),
  page(33, "Strona 33 • Tablica pochodnych i styczna", [
    "Pochodna stalej",
    "Pochodna liniowej",
    "Pochodna kwadratowej",
    "Pochodna x^1",
    "Pochodna odwrotnosci",
    "Pochodna sqrt",
    "Pochodna sin",
    "Pochodna cos",
    "Pochodna tan",
    "Pochodna exp",
    "Rownanie stycznej",
  ]),
  page(34, "Strona 34 • Tablica wartości funkcji trygonometrycznych", [
    "Sinus 0",
    "Cosinus 0",
    "Tangens 0",
    "Cotangens 0",
    "Sinus 30^\\circ",
    "Cosinus 30^\\circ",
    "Tangens 30^\\circ",
    "Cotangens 30^\\circ",
    "Sinus 45^\\circ",
    "Cosinus 45^\\circ",
    "Tangens 45^\\circ",
    "Cotangens 45^\\circ",
    "Sinus 60^\\circ",
    "Cosinus 60^\\circ",
    "Tangens 60^\\circ",
    "Cotangens 60^\\circ",
    "Sinus 90^\\circ",
    "Cosinus 90^\\circ",
    "Tangens 90^\\circ",
    "Cotangens 90^\\circ",
  ]),
];
