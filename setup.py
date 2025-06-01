from setuptools import setup, find_packages

setup(
    name="cryptostalker",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        'flask>=2.0',
        'flask-cors',
        'ccxt',
        'tensorflow',
        'numpy',
        'pandas',
        'python-dotenv',
        'supabase'
    ],
)
