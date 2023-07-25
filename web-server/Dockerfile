FROM python:3.9-slim
WORKDIR /app
COPY ./requirements.txt /app/requirements.txt
RUN pip install --upgrade pip
RUN pip install --no-cache-dir --upgrade -r ./requirements.txt
EXPOSE 4000
COPY ./model.h5 ./inception_module.py ./server.py /app/
CMD python server.py