package com.fooddit.address;

import com.fooddit.address.dto.CreateAddressRequest;
import com.fooddit.address.dto.UpdateAddressRequest;
import com.fooddit.address.dto.UserAddressDto;
import com.fooddit.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;
import java.util.UUID;

/**
 * Saved delivery addresses for the signed-in user (the location switcher's
 * "Saved addresses"). Only the owner may read/modify their addresses.
 */
@RestController
@RequestMapping("/api/me/addresses")
@RequiredArgsConstructor
public class UserAddressController {

    private final UserAddressService addressService;

    @GetMapping
    public List<UserAddressDto> list(@AuthenticationPrincipal Object principal) {
        return addressService.list(CurrentUser.orThrow(principal));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserAddressDto create(@AuthenticationPrincipal Object principal,
                                 @Valid @RequestBody CreateAddressRequest request) {
        return addressService.create(CurrentUser.orThrow(principal), request);
    }

    @PatchMapping("/{id}")
    public UserAddressDto update(@AuthenticationPrincipal Object principal,
                                 @PathVariable UUID id,
                                 @Valid @RequestBody UpdateAddressRequest request) {
        return addressService.update(CurrentUser.orThrow(principal), id, request);
    }

    @PostMapping("/{id}/default")
    public UserAddressDto setDefault(@AuthenticationPrincipal Object principal,
                                     @PathVariable UUID id) {
        return addressService.setDefault(CurrentUser.orThrow(principal), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Object principal,
                       @PathVariable UUID id) {
        addressService.delete(CurrentUser.orThrow(principal), id);
    }
}