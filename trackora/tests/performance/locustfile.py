from locust import HttpUser, between, task


class TrackoraUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def health(self):
        self.client.get("/health/")

    @task(2)
    def schema(self):
        self.client.get("/api/schema/")

