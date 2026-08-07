package common

import "testing"

func TestGeminiImagePreviewModelsAreImageGenerationModels(t *testing.T) {
	for _, model := range []string{
		"gemini-3-pro-image-preview",
		"gemini-3.1-flash-image-preview",
	} {
		if !IsImageGenerationModel(model) {
			t.Fatalf("expected %q to be recognized as an image generation model", model)
		}
	}
}
