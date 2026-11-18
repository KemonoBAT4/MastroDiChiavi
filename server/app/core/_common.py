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
import base64
import hashlib
import hmac
import secrets
import jwt
import argon2
import contextlib

import fastapi.security as fa_security

# from .config import *
# from .security import *

config = configparser.ConfigParser()
config.read("application.cfg")

np = numpy
pd = pandas
sm = sqlmodel
sa = sqlalchemy
fa = fastapi

dotenv.load_dotenv()

DEFAULT_LOG_PREFIX: str = "[MASTRO_DI_CHIAVI]"

def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
# #enddef utcnow

# KDF default parameters , returned by /prelogin for unknown emails
# (must be the same with the one proposed by the client during the registration)
DEFAULT_KDF = {"algorithm": "argon2id", "memory_kib": 65536, "iterations": 3, "parallelism": 4}

_DATABASE_URL = "sqlite:///./data/vault.db"

class Settings(pydantic_settings.BaseSettings):
    model_config = pydantic_settings.SettingsConfigDict(env_file=".env", extra="ignore")

    secret_key           : str                                # at leas 32 chars
    database_url         : str  = _DATABASE_URL
    allow_registration   : bool = True                        # set False after creating the users
    access_token_minutes : int  = 15
    refresh_token_days   : int  = 30
    lockout_threshold    : int  = 5                           # available errors before account lockout
    cors_origins         : str  = ""                          # list speraated by "," (used for WebView/Capacitator)
# #endclass Settings

settings = Settings()


# TODO: need to add fatapi-mail with: pip install fastapi-mail
# see: https://www.geeksforgeeks.org/python/sending-email-using-fastapi-framework-in-python/