import requests
import math
import json as j
import os

sectors_url = "https://www.swcombine.com/ws/v2.0/galaxy/sectors/"
headers = {"Accept" : "application/json"}

response = requests.get(sectors_url, headers=headers)
json = response.json()

total_sectors = json["swcapi"]["sectors"]["attributes"]["total"]
pages = math.ceil(total_sectors / 50)
start = 1

results = []

for n in range(pages):
    response = requests.get(sectors_url, headers=headers, params={"start_index" : start})
    json = response.json()

    for s in json["swcapi"]["sectors"]["sector"]:
        try:
            sector_name = s["attributes"]["name"]
        except:
            print("invalid JSON")
            continue
        sector_uid = s["attributes"]["uid"]
        sector_url = s["attributes"]["href"]
        print(sector_url)

        sector_response = requests.get(sector_url, headers=headers)
        json = sector_response.json()
        points = []
        points_string_svg = ""

        for p in json["swcapi"]["sector"]["coordinates"]["point"]:
            x = p["attributes"]["x"]
            y = p["attributes"]["y"]
            points.append({"x": x, "y": y})
            points_string_svg = points_string_svg + str(x) + "," + str(y) + " "

        points_string_svg = points_string_svg[:-1] # remove trailing space

        systems = []
        try:
            for s in json["swcapi"]["sector"]["systems"]["system"]:
                system_uid = s["attributes"]["uid"]
                system_name = s["attributes"]["name"]
                system_url = s["attributes"]["href"]
                system_response = requests.get(system_url, headers=headers)
                system_json = system_response.json()
                system = {
                    "name" : system_name,
                    "uid" : system_uid,
                    "url" : system_url,
                    "x" : system_json["swcapi"]["system"]["location"]["coordinates"]["galaxy"]["attributes"]["x"],
                    "y" : system_json["swcapi"]["system"]["location"]["coordinates"]["galaxy"]["attributes"]["y"]
                }
                systems.append(system)
        except KeyError:
            systems = [] # do nothing if there are no systems
            
        sector = {
            "name" : sector_name,
            "uid" : sector_uid,
            "url": sector_url,
            "points" : points,
            "points_string_svg" : points_string_svg,
            "systems" : systems
        }

        results.append(sector)

    start += 50

dump = j.dumps(results)
with open("sectors.json", "w") as file:
    file.write(dump)
    print("saved to file: " + os.path.realpath(file.name))


