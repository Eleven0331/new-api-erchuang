package gemini

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConvertGeminiImagePreviewRequest(t *testing.T) {
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)

	converted, err := (&Adaptor{}).ConvertImageRequest(context, &relaycommon.RelayInfo{
		UpstreamModelName: "gemini-3-pro-image-preview",
	}, dto.ImageRequest{
		Prompt:  "a bright city skyline",
		Size:    "16:9",
		Quality: "high",
	})
	require.NoError(t, err)

	geminiRequest, ok := converted.(dto.GeminiChatRequest)
	require.True(t, ok)
	require.Equal(t, []string{"TEXT", "IMAGE"}, geminiRequest.GenerationConfig.ResponseModalities)
	require.Len(t, geminiRequest.Contents, 1)
	require.Equal(t, "a bright city skyline", geminiRequest.Contents[0].Parts[0].Text)

	var imageConfig map[string]string
	require.NoError(t, common.Unmarshal(geminiRequest.GenerationConfig.ImageConfig, &imageConfig))
	assert.Equal(t, "16:9", imageConfig["aspectRatio"])
	assert.Equal(t, "2K", imageConfig["imageSize"])
}

func TestConvertGeminiImagePreviewRequestUsesOriginModelWhenMapped(t *testing.T) {
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)

	converted, err := (&Adaptor{}).ConvertImageRequest(context, &relaycommon.RelayInfo{
		OriginModelName:   "gemini-3-pro-image-preview",
		UpstreamModelName: "image-model-alias",
	}, dto.ImageRequest{Prompt: "a bright city skyline"})
	require.NoError(t, err)
	_, ok := converted.(dto.GeminiChatRequest)
	assert.True(t, ok)
}

func TestConvertGeminiImagePreviewRequestUsesRequestModelWhenRelayInfoIsStale(t *testing.T) {
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)

	converted, err := (&Adaptor{}).ConvertImageRequest(context, &relaycommon.RelayInfo{
		OriginModelName:   "dall-e",
		UpstreamModelName: "dall-e",
	}, dto.ImageRequest{
		Model:  "models/gemini-3.1-flash-image-preview",
		Prompt: "a bright city skyline",
	})
	require.NoError(t, err)
	_, ok := converted.(dto.GeminiChatRequest)
	assert.True(t, ok)
}

func TestConvertImageRequestUsesGeminiGenerateContentForNonImagenModels(t *testing.T) {
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)

	converted, err := (&Adaptor{}).ConvertImageRequest(context, &relaycommon.RelayInfo{
		UpstreamModelName: "channel-model-alias",
	}, dto.ImageRequest{Prompt: "a bright city skyline"})
	require.NoError(t, err)
	_, ok := converted.(dto.GeminiChatRequest)
	assert.True(t, ok)
}

func TestGeminiImageModelDetectionNormalizesModelNames(t *testing.T) {
	assert.True(t, isGeminiImageModel("models/gemini-3.1-flash-image-preview-001"))
	assert.True(t, isGeminiImageModel("google/gemini-3-pro-image-preview"))
}

func TestGeminiChatImageHandlerReturnsInlineImage(t *testing.T) {
	writer := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(writer)
	context.Request = httptest.NewRequest(http.MethodPost, "/v1/images/generations", nil)
	response := &http.Response{
		StatusCode: http.StatusOK,
		Body: io.NopCloser(strings.NewReader(`{
			"candidates":[{"index":0,"content":{"role":"model","parts":[
				{"text":"Generated artwork"},
				{"inlineData":{"mimeType":"image/png","data":"aW1hZ2UtYnl0ZXM="}}
			]}}],
			"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":20,"totalTokenCount":30}
		}`)),
	}

	usage, newAPIError := GeminiChatImageHandler(context, &relaycommon.RelayInfo{}, response)
	require.Nil(t, newAPIError)
	require.Equal(t, 30, usage.TotalTokens)
	require.Equal(t, http.StatusOK, writer.Code)

	var imageResponse dto.ImageResponse
	require.NoError(t, common.Unmarshal(writer.Body.Bytes(), &imageResponse))
	require.Len(t, imageResponse.Data, 1)
	assert.Equal(t, "aW1hZ2UtYnl0ZXM=", imageResponse.Data[0].B64Json)
	assert.Equal(t, "Generated artwork", imageResponse.Data[0].RevisedPrompt)
}
