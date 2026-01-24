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
            points_string_svg = points_string_svg + str(x+500) + "," + str(y+500) + " "

        points_string_svg = points_string_svg[:-1] # remove trailing space
            
        sector = {
            "name" : sector_name,
            "uid" : sector_uid,
            "sector_url": sector_url,
            "points" : points,
            "points_string_svg" : points_string_svg
        }

        results.append(sector)

    start += 50

dump = j.dumps(results)
with open("sectors.json", "w") as file:
    file.write(dump)
    print("saved to file: " + os.path.realpath(file.name))