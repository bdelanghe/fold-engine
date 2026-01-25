variable "IMAGE_NAME" {
  default = "local/unfold-dev"
}

variable "IMAGE_TAG" {
  default = "latest"
}

group "default" {
  targets = ["dev"]
}

target "dev" {
  context = "."
  dockerfile = "Dockerfile"
  tags = ["${IMAGE_NAME}:${IMAGE_TAG}"]
}

target "unfold-dev" {
  inherits = ["dev"]
}
