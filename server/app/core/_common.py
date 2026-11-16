import typing
import sqlmodel
import sqlalchemy
import datetime
import uuid
import enum
import pathlib
import functools

import bcrypt
import dotenv
import configparser
import os
import html
import param
import fastapi
import schema
import collections
import bokeh
import pandas
import pydantic
import requests
import textwrap
import re
import copy
import unidecode
import time
import numpy
import sys
import pandas
import io
import asyncio
import psutil
import pydantic_settings


config = configparser.ConfigParser()
config.read("application.cfg")

np   = numpy
pd   = pandas
fa   = fastapi
sm   = sqlmodel
sa   = sqlalchemy

dotenv.load_dotenv()

DEFAULT_LOG_PREFIX: str = "[LEAFA]"

# TODO: need to add fatapi-mail with: pip install fastapi-mail
# see: https://www.geeksforgeeks.org/python/sending-email-using-fastapi-framework-in-python/