package com.fooddit.address;

import com.fooddit.address.dto.CreateAddressRequest;
import com.fooddit.address.dto.UpdateAddressRequest;
import com.fooddit.address.dto.UserAddressDto;
import com.fooddit.address.entity.UserAddress;
import com.fooddit.address.repository.UserAddressRepository;
import com.fooddit.config.exception.BadRequestException;
import com.fooddit.config.exception.NotFoundException;
import com.fooddit.restaurant.repository.RestaurantRepository;
import com.fooddit.user.entity.User;
import com.fooddit.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserAddressService {

    private final UserAddressRepository addressRepository;
    private final UserRepository userRepository;
    private final RestaurantRepository restaurantRepository;

    @Transactional(readOnly = true)
    public List<UserAddressDto> list(UUID userId) {
        return toDto(addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId));
    }

    @Transactional
    public UserAddressDto create(UUID userId, CreateAddressRequest request) {
        requireServiceable(request.citySlug());
        boolean isFirst = addressRepository.countByUserId(userId) == 0;
        boolean makeDefault = isFirst || Boolean.TRUE.equals(request.isDefault());
        if (makeDefault) {
            clearDefaults(userId);
        }

        User user = userRepository.getReferenceById(userId);
        UserAddress address = new UserAddress();
        address.setUser(user);
        apply(address, request.label(), request.addressLine(), request.locality(),
                request.cityName(), request.citySlug(), request.latitude(), request.longitude());
        address.setDefault(makeDefault);
        return toDto(addressRepository.save(address));
    }

    @Transactional
    public UserAddressDto update(UUID userId, UUID id, UpdateAddressRequest request) {
        UserAddress address = findOwned(userId, id);
        if (request.citySlug() != null && !request.citySlug().isBlank() && !request.citySlug().equals(address.getCitySlug())) {
            requireServiceable(request.citySlug());
        }
        apply(address,
                request.label() != null ? request.label() : address.getLabel(),
                request.addressLine() != null ? request.addressLine() : address.getAddressLine(),
                request.locality() != null ? request.locality() : address.getLocality(),
                request.cityName() != null ? request.cityName() : address.getCityName(),
                request.citySlug() != null ? request.citySlug() : address.getCitySlug(),
                request.latitude() != null ? request.latitude() : address.getLatitude(),
                request.longitude() != null ? request.longitude() : address.getLongitude());
        return toDto(addressRepository.save(address));
    }

    @Transactional
    public UserAddressDto setDefault(UUID userId, UUID id) {
        UserAddress address = findOwned(userId, id);
        clearDefaults(userId);
        address.setDefault(true);
        return toDto(addressRepository.save(address));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        UserAddress address = findOwned(userId, id);
        boolean wasDefault = address.isDefault();
        addressRepository.delete(address);
        if (wasDefault) {
            addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId).stream()
                    .findFirst()
                    .ifPresent(a -> {
                        a.setDefault(true);
                        addressRepository.save(a);
                    });
        }
    }

    private void requireServiceable(String citySlug) {
        if (citySlug == null || citySlug.isBlank() || !restaurantRepository.existsByCitySlug(citySlug)) {
            throw new BadRequestException("We don't deliver to this location yet");
        }
    }

    private void clearDefaults(UUID userId) {
        for (UserAddress a : addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId)) {
            if (a.isDefault()) {
                a.setDefault(false);
                addressRepository.save(a);
            }
        }
    }

    private UserAddress findOwned(UUID userId, UUID id) {
        return addressRepository.findById(id)
                .filter(a -> a.getUser().getId().equals(userId))
                .orElseThrow(() -> new NotFoundException("Address not found"));
    }

    private void apply(UserAddress address, String label, String addressLine, String locality,
                       String cityName, String citySlug, java.math.BigDecimal latitude,
                       java.math.BigDecimal longitude) {
        address.setLabel(label);
        address.setAddressLine(addressLine);
        address.setLocality(locality);
        address.setCityName(cityName);
        address.setCitySlug(citySlug);
        address.setLatitude(latitude);
        address.setLongitude(longitude);
    }

    private List<UserAddressDto> toDto(List<UserAddress> addresses) {
        return addresses.stream().map(this::toDto).toList();
    }

    private UserAddressDto toDto(UserAddress a) {
        return new UserAddressDto(a.getId(), a.getLabel(), a.getAddressLine(), a.getLocality(),
                a.getCityName(), a.getCitySlug(), a.getLatitude(), a.getLongitude(),
                a.isDefault(), a.getCreatedAt());
    }
}