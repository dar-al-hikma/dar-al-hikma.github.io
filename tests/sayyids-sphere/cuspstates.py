# Find slider-reachable states (latitude in 0.5° steps, sidereal time in 0.25° steps, true obliquity)
# where the ASC or the MC lies within half a minute below a sign cusp, so that correct rounding
# must show 00° of the next sign. Values from the independent vector model (ref.py), after a float pre-search.
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # ref.py beside this file, and nowhere else
from ref import axes, mpf
EPS = 23.4392911
def asc_f(lat, lst):
    f, t, e = map(math.radians, (lat, lst, EPS))
    return math.degrees(math.atan2(math.cos(t), -(math.sin(t)*math.cos(e) + math.tan(f)*math.sin(e)))) % 360
def mc_f(lst):
    t, e = math.radians(lst), math.radians(EPS)
    return math.degrees(math.atan2(math.sin(t), math.cos(t)*math.cos(e))) % 360
found = {'asc': {}, 'mc': {}, 'az': None}
for k in range(1440):
    lst = k/4
    m = mc_f(lst); c = round(m/30)*30 % 360
    d = (c - m) % 360
    if 0 < d*60 < 0.45 and c not in found['mc']:
        r = axes(40, mpf(lst), mpf(EPS)); mm = float(r['mc_std'])
        if 0 < ((c - mm) % 360)*60 < 0.5: found['mc'][c] = {'lat': 40, 'lst': lst, 'val': mm}
for li in range(-132, 133):
    lat = li/2
    for k in range(1440):
        lst = k/4
        a = asc_f(lat, lst); c = round(a/30)*30 % 360
        d = (c - a) % 360
        if 0 < d*60 < 0.45 and c not in found['asc']:
            r = axes(mpf(lat), mpf(lst), mpf(EPS))
            if r is None: continue
            aa = float(r['asc'])
            if 0 < ((c - aa) % 360)*60 < 0.5: found['asc'][c] = {'lat': lat, 'lst': lst, 'val': aa}
    if len(found['asc']) == 12: break
json.dump(found, sys.stdout, indent=1)
