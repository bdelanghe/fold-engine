variable "IMAGE_NAME" {
  default = "local/unfold-dev"
}

group "default" {
  targets = ["dev"]
}

target "dev" {
  context = "."
  dockerfile = "Dockerfile"
  tags = ["${IMAGE_NAME}:latest"]
}
