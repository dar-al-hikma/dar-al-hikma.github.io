# Independent reference model (mpmath, 30 digits). Horizon frame: (East, North, Up).
from mpmath import mp, mpf, sin, cos, tan, atan2, asin, acos, radians as rad, degrees as deg, sqrt, fabs
mp.dps = 30
def n360(x):
    x = x % 360
    return x + 360 if x < 0 else x
def vec(ra, dec):  # equatorial unit vector (x->RA0, y->RA90, z->NCP)
    a, d = rad(ra), rad(dec)
    return [cos(d)*cos(a), cos(d)*sin(a), sin(d)]
def cross(a,b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def norm(a):
    l = sqrt(dot(a,a)); return [x/l for x in a]
def equ_to_hor_basis(lat, lst):
    """Return horizon-frame vectors (E, N, U) expressed in equatorial coords."""
    f, t = rad(lat), rad(lst)
    # zenith: RA = LST, dec = lat
    U = vec(lst, lat)
    # north point on horizon: towards NCP projected: N = (P - (P.U)U) normalized
    P = [mpf(0),mpf(0),mpf(1)]
    pu = dot(P,U)
    N = norm([P[i]-pu*U[i] for i in range(3)])
    E = cross(N, U)  # E = N x U  (for right-handed E,N,U: E x N = U -> N x U = E)
    return E, N, U
def altaz(ra, dec, lat, lst):
    H = rad(lst - ra); d = rad(dec); f = rad(lat)
    alt = asin(sin(f)*sin(d) + cos(f)*cos(d)*cos(H))
    az = atan2(-cos(d)*sin(H), sin(d)*cos(f) - cos(d)*cos(H)*sin(f))
    return n360(deg(az)), deg(alt)
def ecl_to_equ(lon, lat, eps):
    l, b, e = rad(lon), rad(lat), rad(eps)
    x, y, z = cos(b)*cos(l), cos(b)*sin(l), sin(b)
    return [x, y*cos(e) - z*sin(e), y*sin(e) + z*cos(e)]
def equ_to_ecl(ra, dec, eps):
    a, d, e = rad(ra), rad(dec), rad(eps)
    lon = atan2(sin(a)*cos(e) + tan(d)*sin(e), cos(a))
    lat = asin(sin(d)*cos(e) - cos(d)*sin(e)*sin(a))
    return n360(deg(lon)), deg(lat)
def v_to_ecl(v, eps):
    e = rad(eps)
    ye = v[1]*cos(e) + v[2]*sin(e); ze = -v[1]*sin(e) + v[2]*cos(e)
    return n360(deg(atan2(ye, v[0]))), deg(asin(ze))
def v_to_radec(v):
    return n360(deg(atan2(v[1], v[0]))), deg(asin(v[2]))
def axes(lat, lst, eps):
    """Vector method: ecliptic pole K; ASC = ecliptic∩horizon on east side; MC_upper = ecliptic∩meridian above horizon;
    MC_ramc = ecliptic point whose RA = RAMC (standard formula)."""
    E, N, U = equ_to_hor_basis(lat, lst)
    K = ecl_to_equ(0, 90, eps)   # north ecliptic pole in equatorial coords
    a = cross(U, K)              # direction along horizon ∩ ecliptic
    if fabs(dot(a,a)) < mpf('1e-20'): return None
    a = norm(a)
    if dot(a, E) < 0: a = [-x for x in a]
    asc = v_to_ecl(a, eps)[0]
    m = cross(E, K)              # meridian plane normal is E
    m = norm(m)
    if dot(m, U) < 0: m = [-x for x in m]
    mc_up = v_to_ecl(m, eps)[0]
    t, e = rad(lst), rad(eps)
    mc_std = n360(deg(atan2(sin(t), cos(t)*cos(e))))
    asc_std = n360(deg(atan2(cos(t), -(sin(t)*cos(e) + tan(rad(lat))*sin(e)))))
    # is eastern intersection rising w.r.t. increasing longitude?
    return dict(asc=asc, mc_up=mc_up, mc_std=mc_std, asc_std=asc_std, eastdot=dot(a,E))
if __name__ == "__main__":
    # Lesson 4 claim: 30 deg RA <-> 32 10' 51" longitude
    for eps in (mpf('23.4392911'), mpf(23)+mpf(26)/60+mpf(12)/3600, mpf(23)+mpf(26)/60):
        lam = equ_to_ecl(30, 0, eps)  # RA 30 on equator isn't on ecliptic; need ecliptic point with RA 30
        l = n360(deg(atan2(tan(rad(30)), cos(rad(eps)))))
        ra0T = n360(deg(atan2(cos(rad(eps))*sin(rad(30)), cos(rad(30)))))
        print('eps', float(eps), 'ecl lon with RA30 =', float(l), 'RA of 0Tau =', float(ra0T))
    # Lesson 5 Janus table checks (obliquity 23 26')
    e50 = mpf(23)+mpf(26)/60
    for (lst_h, lat) in [((17,36),40),((17,40),46),((17,36),50)]:
        lst = (lst_h[0]+lst_h[1]/mpf(60))*15
        r = axes(lat, lst, e50)
        print('LST', lst_h, 'lat', lat, 'ASC', float(r['asc']), 'std', float(r['asc_std']), 'MC', float(r['mc_up']), float(r['mc_std']))
    r = axes(-45, 240, e50); print('45S LST16', {k: float(v) for k,v in r.items()})
