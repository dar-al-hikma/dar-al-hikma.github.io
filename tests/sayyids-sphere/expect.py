# Expected values for the Sphere tests, from the internal review's independent mpmath model
# (ref.py beside this file, 30 digits). Reads a JSON list of states on stdin, writes a JSON list.
# State: {lat, lst, obl, [ra, dec] | [sunlon]}. Nothing here comes from the page.
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # ref.py beside this file, and nowhere else
from ref import mp, mpf, altaz, ecl_to_equ, equ_to_ecl, v_to_radec, axes, equ_to_hor_basis, cross, dot, sqrt, asin, deg, fabs
def f(x): return None if x is None else float(x)
out = []
for st in json.load(sys.stdin):
    lat, lst, eps = mpf(st['lat']), mpf(st['lst']), mpf(st['obl'])
    r = {}
    E, N, U = equ_to_hor_basis(lat, lst)
    K = ecl_to_equ(0, 90, eps)
    c = cross(U, K)
    r['planeSin'] = f(sqrt(dot(c, c)))                    # sine of the angle between horizon and ecliptic
    a = axes(lat, lst, eps)
    r['asc'] = f(a['asc']) if a else None                  # the eastern intersection
    r['mc'] = f(a['mc_std']) if a else None                # the degree whose RA is the RAMC (Lesson 5's formula)
    if a is None:                                          # planes coincide: the MC is still RA = RAMC
        from mpmath import atan2, sin, cos, radians, degrees
        t, e = radians(lst), radians(eps)
        r['mc'] = float(degrees(atan2(sin(t), cos(t)*cos(e))) % 360)
    mv = ecl_to_equ(mpf(r['mc']), 0, eps)
    ra_mc, dec_mc = v_to_radec(mv)
    r['mcAlt'] = f(altaz(ra_mc, dec_mc, lat, lst)[1])
    if 'ra' in st:
        ra, dec = mpf(st['ra']), mpf(st['dec'])
    elif 'sunlon' in st:
        ra, dec = v_to_radec(ecl_to_equ(mpf(st['sunlon']), 0, eps))
    else:
        ra = dec = None
    if ra is not None:
        az, alt = altaz(ra, dec, lat, lst)
        lon, blat = equ_to_ecl(ra, dec, eps)
        if 'sunlon' in st: lon, blat = mpf(st['sunlon']) % 360, mpf(0)
        r.update(az=f(az), alt=f(alt), ra=f(ra), dec=f(dec), lon=f(lon), blat=f(blat))
    out.append(r)
json.dump(out, sys.stdout)
